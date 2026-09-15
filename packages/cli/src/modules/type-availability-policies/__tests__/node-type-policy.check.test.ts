import type { LicenseState } from '@n8n/backend-common';
import type { ContentImportTransport, PolicedWorkflow } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NodeTypePolicyCheck } from '../node-type-policy.check';
import type {
	ComposedTypeEvaluation,
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

const SLACK = 'n8n-nodes-base.slack';
const GMAIL = 'n8n-nodes-base.gmail';
const SET = 'n8n-nodes-base.set';

const node = (type: string, name = type, disabled = false): INode =>
	({ id: name, name, type, typeVersion: 1, position: [0, 0], parameters: {}, disabled }) as INode;

const workflow = (nodes: INode[], id: string | null = 'wf-1'): PolicedWorkflow => ({
	id,
	name: 'My workflow',
	nodes,
});

const denied = (
	name: string,
	overrides: Partial<ComposedTypeVerdict> = {},
): ComposedTypeVerdict => ({
	name,
	action: 'deny',
	scope: 'instance',
	matchedRuleId: 'rule-7',
	optInAvailable: false,
	...overrides,
});

const allowed = (name: string): ComposedTypeVerdict => ({
	name,
	action: 'allow',
	scope: 'instance',
	matchedRuleId: null,
	optInAvailable: false,
});

const versions: ComposedTypeEvaluation['versions'] = [
	{ scope: 'instance', version: 4 },
	{ scope: 'project', version: 2 },
];

describe('NodeTypePolicyCheck', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const licenseState = mock<LicenseState>();
	const check = new NodeTypePolicyCheck(service, licenseState);

	/** Denies whichever of the requested types are in `deniedTypes`. */
	const denying = (deniedTypes: string[], verdictOverrides: Partial<ComposedTypeVerdict> = {}) =>
		service.evaluateComposedTypesFor.mockImplementation(async (_kind, _projectId, typeNames) => ({
			verdicts: typeNames.map((name) =>
				deniedTypes.includes(name) ? denied(name, verdictOverrides) : allowed(name),
			),
			versions,
		}));

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isLicensed.mockReturnValue(true);
		denying([SLACK, GMAIL]);
	});

	describe('onWorkflowSave', () => {
		it('reports nothing when the stored workflow already had the denied type', async () => {
			const nodes = [node(SET), node(SLACK)];

			const result = await check.onWorkflowSave({
				workflow: workflow(nodes),
				storedWorkflow: workflow(nodes),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});

		it('reports only the newly added denied type', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([node(SET), node(SLACK), node(GMAIL)]),
				storedWorkflow: workflow([node(SET), node(SLACK)]),
				projectId: 'project-1',
			});

			expect(result.violations).toHaveLength(1);
			expect(result.violations[0].subject).toBe(GMAIL);
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith('node-types', 'project-1', [
				GMAIL,
			]);
		});

		it('tolerates a second node of an already stored denied type, renamed and reordered', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([node(SLACK, 'Slack copy'), node(SET, 'renamed'), node(SLACK)]),
				storedWorkflow: workflow([node(SET), node(SLACK)]),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
		});

		it('reports every denied type when the workflow is new', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([node(SLACK), node(GMAIL), node(SET)], null),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK, GMAIL]);
		});

		it('reports one violation for several nodes of the same denied type', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([node(SLACK, 'a'), node(SLACK, 'b'), node(SLACK, 'c')], null),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations).toHaveLength(1);
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith('node-types', 'project-1', [
				SLACK,
			]);
		});

		it('counts a disabled node, so enabling it later cannot slip past the diff', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([node(SET), node(SLACK, 'Slack', true)], null),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK]);
		});
	});

	describe('the points that report the full list', () => {
		const nodes = [node(SET), node(SLACK), node(GMAIL)];

		it('reports every denied type on publish, even one the stored workflow had', async () => {
			const result = await check.onWorkflowPublish({
				workflow: workflow(nodes),
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK, GMAIL]);
		});

		it('reports every denied type on start', async () => {
			const result = await check.onWorkflowStart({
				workflow: workflow(nodes),
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK, GMAIL]);
		});

		it('judges a transfer against the target project', async () => {
			const result = await check.onWorkflowTransfer({
				workflow: workflow(nodes),
				targetProjectId: 'target-project',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK, GMAIL]);
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
				'node-types',
				'target-project',
				[SET, SLACK, GMAIL],
			);
		});

		const transports: ContentImportTransport[] = [
			'cli',
			'source-control',
			'package',
			'git-connection',
		];

		it.each(transports)('reports every denied type on a %s import', async (transport) => {
			const result = await check.onContentImport({
				workflow: workflow(nodes),
				projectId: 'project-1',
				transport,
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK, GMAIL]);
		});
	});

	describe('scope resolution', () => {
		it('evaluates instance-only when no project applies', async () => {
			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK)]),
				projectId: null,
			});

			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith('node-types', null, [SLACK]);
			expect(result.violations).toHaveLength(1);
		});

		it('passes the read scope versions through for the audit line', async () => {
			denying([]);

			const result = await check.onWorkflowStart({
				workflow: workflow([node(SET)]),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(result.policyVersions).toEqual(versions);
		});
	});

	describe('violation shape', () => {
		it('names the deciding rule and scope', async () => {
			denying([SLACK], { scope: 'project', matchedRuleId: 'rule-3' });

			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK)]),
				projectId: 'project-1',
			});

			expect(result.violations[0]).toStrictEqual({
				kind: 'node-type-unavailable',
				checkId: 'node-type-availability',
				message: `Node type "${SLACK}" is blocked by this project's policy`,
				subject: SLACK,
				subjectType: 'nodeType',
				scope: 'project',
				matchedRuleId: 'rule-3',
			});
		});

		it('omits the rule id when the scope default decided', async () => {
			denying([SLACK], { matchedRuleId: null });

			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK)]),
				projectId: 'project-1',
			});

			expect(result.violations[0]).toStrictEqual({
				kind: 'node-type-unavailable',
				checkId: 'node-type-availability',
				message: `Node type "${SLACK}" is blocked by an instance policy`,
				subject: SLACK,
				subjectType: 'nodeType',
				scope: 'instance',
			});
		});
	});

	describe('when the store is not worth reading', () => {
		it('reports nothing without a license, and never reads the policy', async () => {
			licenseState.isLicensed.mockReturnValue(false);

			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK)]),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});

		it('reports nothing for a workflow with no nodes', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([], null),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});
	});
});
