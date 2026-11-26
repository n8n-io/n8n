import type { EventService } from '@n8n/backend-services';
import type { ProjectRepository, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from '../constants';
import { TypeAvailabilityPolicyScope } from '../database/entities/type-availability-policy-scope.entity';
import type { TypeAvailabilityPolicyAttachmentRepository } from '../database/repositories/type-availability-policy-attachment.repository';
import type {
	ProjectPolicyScope,
	TypeAvailabilityPolicyScopeRepository,
} from '../database/repositories/type-availability-policy-scope.repository';
import type { TypeAvailabilityPolicyRepository } from '../database/repositories/type-availability-policy.repository';
import { listedNodeTypes } from '../listed-node-types';
import type { PolicyAction, PolicyRule } from '../policy-rule.types';
import type { TypeAvailabilityPolicySnapshot } from '../type-availability-policy-snapshot';
import { TypeAvailabilityPolicyService } from '../type-availability-policy.service';

const SLACK = 'n8n-nodes-base.slack';
const GMAIL = 'n8n-nodes-base.gmail';
const NOTION = 'n8n-nodes-base.notion';
const JIRA = 'n8n-nodes-base.jira';
const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';
const COMMUNITY = 'n8n-nodes-community.thing';
const NODE_TYPES = [SLACK, GMAIL, NOTION, JIRA];

const UPDATED_AT = new Date('2026-11-20T10:00:00.000Z');

const rule =
	(action: PolicyAction) =>
	(id: string, value: string, kind: 'name' | 'package' | 'extends' = 'name'): PolicyRule => ({
		id,
		action,
		selector: { kind, value },
	});
const deny = rule('deny');
const allow = rule('allow');
const delegate = rule('delegate');

describe('TypeAvailabilityPolicyService.summarizeProjectPolicies', () => {
	const scopeRepository = mock<TypeAvailabilityPolicyScopeRepository>();
	const attachmentRepository = mock<TypeAvailabilityPolicyAttachmentRepository>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const nodeTypes = mock<NodeTypes>();

	const service = new TypeAvailabilityPolicyService(
		mock<TypeAvailabilityPolicyRepository>(),
		scopeRepository,
		attachmentRepository,
		mock<TransactionRunner>(),
		mock<EventService>(),
		mock<TypeAvailabilityPolicySnapshot>(),
		loadNodesAndCredentials,
		nodeTypes,
		mock<ProjectRepository>(),
	);

	let rulesByScope: Map<string, PolicyRule[]>;

	function makeScope(id: string, projectId: string | null, defaultAction: PolicyAction = 'allow') {
		return Object.assign(new TypeAvailabilityPolicyScope(), {
			id,
			kind: NODE_TYPES_KIND,
			projectId,
			defaultAction,
			version: 1,
			updatedBy: 'user-1',
			updatedAt: UPDATED_AT,
		});
	}

	function givenInstance(rules: PolicyRule[], defaultAction: PolicyAction = 'allow') {
		rulesByScope.set('instance', rules);
		scopeRepository.findScopeByKindAndProject.mockResolvedValue(
			makeScope('instance', null, defaultAction),
		);
	}

	function givenProjects(
		...projects: Array<{ id: string; rules: PolicyRule[]; defaultAction?: PolicyAction }>
	) {
		for (const project of projects) rulesByScope.set(`scope-${project.id}`, project.rules);
		scopeRepository.findProjectScopes.mockResolvedValue(
			projects.map(
				(project) =>
					makeScope(`scope-${project.id}`, project.id, project.defaultAction) as ProjectPolicyScope,
			),
		);
	}

	const attachment = (scopeId: string) => ({
		policyId: `policy-${scopeId}`,
		rules: rulesByScope.get(scopeId) ?? [],
		priority: 0,
		isFloor: false,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		rulesByScope = new Map();
		givenInstance([]);
		givenProjects();
		attachmentRepository.listAttachmentsForScope.mockImplementation(async (scopeId) => [
			attachment(scopeId),
		]);
		attachmentRepository.listAttachmentsForScopes.mockImplementation(
			async (scopeIds) => new Map(scopeIds.map((scopeId) => [scopeId, [attachment(scopeId)]])),
		);
		nodeTypes.resolveBaseName.mockImplementation((name) =>
			name === GMAIL_TOOL
				? { baseName: GMAIL, isSyntheticTool: true }
				: { baseName: name, isSyntheticTool: false },
		);
	});

	const summarize = async (types = NODE_TYPES, hidden: string[] = []) =>
		await service.summarizeProjectPolicies(NODE_TYPES_KIND, types, (verdicts, rules) =>
			listedNodeTypes(verdicts, {
				resolveBaseName: (name) => nodeTypes.resolveBaseName(name),
				hiddenTypes: new Set(hidden),
				rules,
			}),
		);
	const projectSummary = (result: Awaited<ReturnType<typeof summarize>>, projectId = 'project-a') =>
		result.byProject.get(projectId)?.summary;

	it('reports the instance totals, and no project without a scope row', async () => {
		givenInstance([deny('r1', SLACK)]);

		const result = await summarize();

		expect(result.withoutProjectPolicy).toEqual({ allowed: 3, restricted: 1 });
		expect(result.byProject.size).toBe(0);
	});

	it('counts the types a project restricts on top of the instance', async () => {
		givenInstance([deny('r1', SLACK)]);
		givenProjects({ id: 'project-a', rules: [deny('p1', GMAIL), deny('p2', NOTION)] });

		const result = await summarize();

		expect(result.byProject.get('project-a')).toEqual({
			updatedAt: UPDATED_AT,
			summary: { restricted: 2, optedIn: 0, effective: { allowed: 1, restricted: 3 } },
		});
	});

	it('does not count a project rule on a type the instance already restricts', async () => {
		givenInstance([deny('r1', SLACK)]);
		givenProjects({ id: 'project-a', rules: [deny('p1', SLACK)] });

		const result = await summarize();

		expect(projectSummary(result)).toMatchObject({
			restricted: 0,
			effective: { allowed: 3, restricted: 1 },
		});
	});

	it('counts every type that one package rule matches', async () => {
		givenProjects({ id: 'project-a', rules: [deny('p1', 'n8n-nodes-base', 'package')] });

		const result = await summarize([...NODE_TYPES, COMMUNITY]);

		expect(projectSummary(result)).toMatchObject({
			restricted: 4,
			effective: { allowed: 1, restricted: 4 },
		});
	});

	describe('delegated types', () => {
		beforeEach(() => givenInstance([delegate('r1', SLACK), delegate('r2', GMAIL)]));

		it('restrict a project without a policy', async () => {
			const result = await summarize();

			expect(result.withoutProjectPolicy).toEqual({ allowed: 2, restricted: 2 });
		});

		it('count as opted in when a project allow rule names them', async () => {
			givenProjects({ id: 'project-a', rules: [allow('p1', SLACK)] });

			const result = await summarize();

			expect(projectSummary(result)).toMatchObject({
				restricted: 0,
				optedIn: 1,
				effective: { allowed: 3, restricted: 1 },
			});
		});

		it('do not count as restricted when a project denies them by default', async () => {
			givenProjects({ id: 'project-a', rules: [allow('p1', SLACK)], defaultAction: 'deny' });

			const result = await summarize();

			// Notion and Jira are the only types the project blocks that the instance allows.
			expect(projectSummary(result)).toMatchObject({
				restricted: 2,
				optedIn: 1,
				effective: { allowed: 1, restricted: 3 },
			});
		});
	});

	describe('the node types counted', () => {
		it('leave out a hidden type', async () => {
			const result = await summarize(NODE_TYPES, [JIRA]);

			expect(result.withoutProjectPolicy).toEqual({ allowed: 3, restricted: 0 });
		});

		it('keep a hidden type that an instance name rule decides', async () => {
			givenInstance([deny('r1', JIRA)]);

			const result = await summarize(NODE_TYPES, [JIRA]);

			expect(result.withoutProjectPolicy).toEqual({ allowed: 3, restricted: 1 });
		});

		it('leave out a hidden type that a broader instance rule decides', async () => {
			givenInstance([deny('r1', 'n8n-nodes-base', 'package')]);

			const result = await summarize(NODE_TYPES, [JIRA]);

			expect(result.withoutProjectPolicy).toEqual({ allowed: 0, restricted: 3 });
		});

		it('leave out a tool variant that follows its base type', async () => {
			givenInstance([deny('r1', GMAIL)]);

			const result = await summarize([...NODE_TYPES, GMAIL_TOOL]);

			expect(result.withoutProjectPolicy).toEqual({ allowed: 3, restricted: 1 });
		});

		it('count nothing for a project rule on a hidden type', async () => {
			givenProjects({ id: 'project-a', rules: [deny('p1', JIRA)] });

			const result = await summarize(NODE_TYPES, [JIRA]);

			expect(projectSummary(result)).toMatchObject({
				restricted: 0,
				effective: { allowed: 3, restricted: 0 },
			});
		});

		it('count a base type and its following tool variant once', async () => {
			givenProjects({ id: 'project-a', rules: [deny('p1', GMAIL)] });

			const result = await summarize([...NODE_TYPES, GMAIL_TOOL]);

			expect(projectSummary(result)).toMatchObject({
				restricted: 1,
				effective: { allowed: 3, restricted: 1 },
			});
		});

		it('keep a tool variant that a different instance rule decides', async () => {
			givenInstance([allow('r0', GMAIL_TOOL), deny('r1', GMAIL)]);

			const result = await summarize([...NODE_TYPES, GMAIL_TOOL]);

			expect(result.withoutProjectPolicy).toEqual({ allowed: 4, restricted: 1 });
		});
	});

	it('lists every credential type when no filter is given', async () => {
		Object.assign(loadNodesAndCredentials, {
			knownCredentials: {
				oAuth2Api: { className: 'oAuth2Api', sourcePath: '' },
				googleOAuth2Api: { className: 'googleOAuth2Api', sourcePath: '', extends: ['oAuth2Api'] },
				slackApi: { className: 'slackApi', sourcePath: '' },
			},
		});
		givenProjects({ id: 'project-a', rules: [deny('p1', 'oAuth2Api', 'extends')] });

		const result = await service.summarizeProjectPolicies(CREDENTIAL_TYPES_KIND, [
			'oAuth2Api',
			'googleOAuth2Api',
			'slackApi',
		]);

		expect(result.withoutProjectPolicy).toEqual({ allowed: 3, restricted: 0 });
		expect(projectSummary(result)).toMatchObject({
			restricted: 2,
			effective: { allowed: 1, restricted: 2 },
		});
	});
});
