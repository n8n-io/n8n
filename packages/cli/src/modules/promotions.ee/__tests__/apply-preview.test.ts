import type { INode } from 'n8n-workflow';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import type {
	InventoryCredential,
	InventoryVariable,
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';
import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';

import type { ApplyDependencyFacts } from '../apply-dependency-check';
import { toPreviewCheck } from '../apply-preview';
import {
	collectCredentialReferences,
	collectVariableReferences,
	collectWorkflowReferences,
} from '../package-references';

const ALPHA = { id: 'p1', name: 'Alpha' };
const BETA = { id: 'p2', name: 'Beta' };

const node = (name: string, extra: Partial<INode>): INode => ({
	id: name,
	name,
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...extra,
});

const credentialNode = (name: string, type: string, id: string | null, credentialName: string) =>
	node(name, { credentials: { [type]: { id, name: credentialName } } });

const variableNode = (name: string, expression: string) =>
	node(name, { parameters: { value: expression } });

const workflow = (id: string, projectId: string, nodes: INode[]): InventoryWorkflow =>
	({
		path: `projects/${projectId}/workflows/${id}/workflow.json`,
		projectId,
		id,
		name: `Workflow ${id}`,
		content: { name: `Workflow ${id}`, nodes, connections: {} },
	}) as unknown as InventoryWorkflow;

const variableFile = (name: string, projectId: string | null): InventoryVariable => ({
	path: `${projectId ? `projects/${projectId}/` : ''}variables/${name}/variable.json`,
	projectId,
	variable: { name, type: 'string' },
});

/** A credential file. Without a project, the file is at the top level of the package. */
const credentialFile = (
	id: string,
	projectId: string | null,
	name: string,
): InventoryCredential => ({
	path: `${projectId ? `projects/${projectId}/` : ''}credentials/${id}/credential.json`,
	projectId,
	credential: { id, name, type: 'githubApi', data: { token: '={{ $vars.TOKEN }}' } },
});

const credentialIssue = (
	sourceId: string,
	workflowIds: string[],
	failure: Partial<Extract<BlockingIssue, { type: 'credential-unresolved' }>> = {},
): BlockingIssue => ({
	type: 'credential-unresolved',
	kind: 'not_found',
	reason: 'not-on-instance',
	sourceId,
	usedBy: workflowIds.map((id) => ({ kind: 'workflow', id })),
	...failure,
});

const consumer = (project: typeof ALPHA, ...ids: string[]) => ({
	project,
	workflows: ids.map((id) => ({ id, name: `Workflow ${id}` })),
});

/** The user holds no access outside the projects of the workflows, and no workflow is applied. */
const NO_ACCESS: ApplyDependencyFacts = {
	credentialProjectIds: new Set(),
	appliedWorkflowIds: new Set(),
	instanceWorkflows: new Map(),
	readableProjectIds: new Set(),
	callerPolicyDefault: 'workflowsFromSameOwner',
};

/** Runs the reference scan on the package, as the preview does, then the Apply check. */
function checkPackage(
	{
		workflows,
		variables = [],
		credentials = [],
		requirements = {},
		issues = [],
		dependencies = {},
	}: {
		workflows: InventoryWorkflow[];
		variables?: InventoryVariable[];
		credentials?: InventoryCredential[];
		requirements?: PackageRequirements;
		issues?: BlockingIssue[];
		dependencies?: Partial<ApplyDependencyFacts>;
	},
	matched: Record<string, Array<{ name: string; scopes: Array<'project' | 'global'> }>> = {},
) {
	const inventory = {
		projects: [ALPHA, BETA].map((project) => ({ ...project, path: `projects/${project.id}` })),
		workflows,
		folders: [],
		credentials,
		variables,
		dataTables: [],
	} as unknown as PackageDirectoryInventory;
	const plan = {
		manifest: { requirements },
		projectPlan: { items: [] },
		scopes: [ALPHA, BETA].map(({ id }) => ({
			project: { id },
			plan: { blockingIssues: [], variablePlan: { matched: matched[id] ?? [] } },
		})),
		issues,
	} as unknown as PackageImportPlan;

	return toPreviewCheck({
		plan,
		inventory,
		credentials: collectCredentialReferences(inventory),
		variables: collectVariableReferences(inventory, new VariableRequirementsExtractor()),
		workflows: collectWorkflowReferences(inventory),
		moves: { workflows: [], folders: [] },
		dependencies: { ...NO_ACCESS, ...dependencies },
	});
}

describe('toPreviewCheck', () => {
	it('names the project whose plan raised a blocker that stops the whole project', () => {
		// An Apply of the whole instance plans Alpha and Beta. Only the plan of Beta is blocked.
		const checkNotRun: BlockingIssue = { type: 'policy-check-failed', point: 'contentImport' };
		const scope = (id: string, blockingIssues: BlockingIssue[]) => ({
			project: { id },
			plan: { blockingIssues, variablePlan: { matched: [] } },
		});
		const plan = {
			manifest: {},
			projectPlan: { items: [] },
			scopes: [scope('p1', []), scope('p2', [checkNotRun])],
			issues: [checkNotRun],
		} as unknown as PackageImportPlan;
		const inventory = {
			projects: [
				{ id: 'p1', name: 'Alpha', path: 'projects/alpha' },
				{ id: 'p2', name: 'Beta', path: 'projects/beta' },
			],
			workflows: [],
			folders: [],
			credentials: [],
			variables: [],
			dataTables: [],
		} as unknown as PackageDirectoryInventory;

		const check = toPreviewCheck({
			plan,
			inventory,
			credentials: [],
			variables: [],
			workflows: [],
			moves: { workflows: [], folders: [] },
			dependencies: NO_ACCESS,
		});

		expect(check.conflicts).toEqual([
			{
				kind: 'project',
				code: 'check-not-run',
				project: { id: 'p2', name: 'Beta' },
				reason: 'contentImport',
			},
		]);
	});

	it('blocks a credential reference without an id, and a credential id used with two types', () => {
		const { conflicts } = checkPackage({
			workflows: [
				workflow('wf-1', ALPHA.id, [
					credentialNode('Test', 'githubApi', null, 'Test GitHub'),
					credentialNode('As GitHub', 'githubApi', 'cred-1', 'Shared'),
				]),
				workflow('wf-2', ALPHA.id, [
					credentialNode('Production', 'githubApi', null, 'Production GitHub'),
					credentialNode('As GitLab', 'gitlabApi', 'cred-1', 'Shared'),
				]),
				workflow('wf-3', ALPHA.id, [
					credentialNode('Production', 'githubApi', null, 'Production GitHub'),
				]),
			],
		});

		// References without an id group by type and name. References with an id group by id.
		expect(conflicts).toEqual([
			expect.objectContaining({
				code: 'conflicting-types',
				sourceId: 'cred-1',
				expectedTypes: ['githubApi', 'gitlabApi'],
				consumers: [consumer(ALPHA, 'wf-1', 'wf-2')],
			}),
			expect.objectContaining({
				code: 'missing-id',
				name: 'Test GitHub',
				consumers: [consumer(ALPHA, 'wf-1')],
			}),
			expect.objectContaining({
				code: 'missing-id',
				name: 'Production GitHub',
				consumers: [consumer(ALPHA, 'wf-2', 'wf-3')],
			}),
		]);
	});

	it('blocks a variable that only another project defines, and accepts a global definition', () => {
		const check = checkPackage(
			{
				workflows: [
					workflow('wf-a', ALPHA.id, [
						variableNode('Set', '={{ $vars.REGION }} {{ $vars.GLOBAL_ONLY }}'),
					]),
					workflow('wf-b', BETA.id, [variableNode('Set', '={{ $vars.REGION }}')]),
				],
				variables: [variableFile('GLOBAL_ONLY', null), variableFile('REGION', BETA.id)],
			},
			{
				[ALPHA.id]: [{ name: 'GLOBAL_ONLY', scopes: ['global'] }],
				[BETA.id]: [{ name: 'REGION', scopes: ['project'] }],
			},
		);

		expect(check.missingBindings).toEqual([]);
		expect(check.conflicts).toEqual([
			{
				kind: 'variable',
				code: 'missing-definition',
				name: 'REGION',
				consumers: [consumer(ALPHA, 'wf-a')],
				referenceFiles: ['projects/p1/workflows/wf-a/workflow.json'],
			},
		]);
	});
});

describe('toPreviewCheck: missing dependencies', () => {
	const usesCredential = (id: string, projectId: string, credentialId = 'cred-1') =>
		workflow(id, projectId, [credentialNode('Request', 'githubApi', credentialId, 'Node name')]);
	const credentialEntry = {
		kind: 'credential',
		id: 'cred-1',
		name: 'GitHub key',
		credentialType: 'githubApi',
		blocking: true,
	};
	const needsAction = { group: 'needs-action', accessible: true };
	const outsideAccess = { group: 'outside-access', accessible: false };

	it('lists a missing credential of the project of its workflow, next to its binding', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			credentials: [credentialFile('cred-1', ALPHA.id, 'GitHub key')],
			issues: [credentialIssue('cred-1', ['wf-1'])],
		});

		expect(check.missingBindings).toEqual([
			{
				kind: 'credential',
				sourceId: 'cred-1',
				name: 'GitHub key',
				credentialType: 'githubApi',
				consumers: [consumer(ALPHA, 'wf-1')],
				ownerProject: ALPHA,
				expressionData: { token: '={{ $vars.TOKEN }}' },
			},
		]);
		expect(check.missingDependencies).toEqual([
			{
				...credentialEntry,
				...needsAction,
				reason: 'not-on-instance',
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
	});

	it('keeps the binding of a missing credential of another project when the user can create it there', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			credentials: [credentialFile('cred-1', BETA.id, 'GitHub key')],
			issues: [credentialIssue('cred-1', ['wf-1'])],
			dependencies: { credentialProjectIds: new Set([BETA.id]) },
		});

		expect(check.missingBindings).toEqual([
			expect.objectContaining({ sourceId: 'cred-1', ownerProject: BETA }),
		]);
		expect(check.missingDependencies).toEqual([
			{
				...credentialEntry,
				...needsAction,
				reason: 'not-on-instance',
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
	});

	it('lists a missing credential of a project that the user cannot access, without its binding', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			credentials: [credentialFile('cred-1', BETA.id, 'GitHub key')],
			issues: [credentialIssue('cred-1', ['wf-1'])],
		});

		expect(check.missingBindings).toEqual([]);
		expect(check.conflicts).toEqual([]);
		expect(check.missingDependencies).toEqual([
			{
				...credentialEntry,
				...outsideAccess,
				reason: 'not-on-instance',
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
		// The entry names the projects of the workflows only.
		expect(JSON.stringify(check)).not.toContain(BETA.id);
		expect(JSON.stringify(check)).not.toContain(BETA.name);
	});

	it('keeps the binding when one of the workflows is in the project of the credential', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id), usesCredential('wf-2', BETA.id)],
			credentials: [credentialFile('cred-1', BETA.id, 'GitHub key')],
			issues: [credentialIssue('cred-1', ['wf-1']), credentialIssue('cred-1', ['wf-2'])],
		});

		expect(check.missingBindings).toHaveLength(1);
		expect(check.missingDependencies).toEqual([
			{
				...credentialEntry,
				...needsAction,
				reason: 'not-on-instance',
				consumers: [consumer(ALPHA, 'wf-1'), consumer(BETA, 'wf-2')],
			},
		]);
	});

	it.each([
		['a file at the top level', [credentialFile('cred-1', null, 'GitHub key')], 'GitHub key'],
		['no file', [], 'Row name'],
	])(
		'lists a missing credential with %s only in the list, and reports no conflict',
		(_case, credentials, name) => {
			const check = checkPackage({
				workflows: [usesCredential('wf-1', ALPHA.id)],
				credentials,
				requirements: {
					credentials: [
						{
							id: 'cred-1',
							name: 'Row name',
							type: 'githubApi',
							usedBy: [{ kind: 'workflow', id: 'wf-1' }],
						},
					],
				},
				issues: [credentialIssue('cred-1', ['wf-1'])],
				// Access to the projects does not help: the credential has no owner project.
				dependencies: { credentialProjectIds: new Set([ALPHA.id, BETA.id]) },
			});

			expect(check.missingBindings).toEqual([]);
			expect(check.conflicts).toEqual([]);
			expect(check.missingDependencies).toEqual([
				{
					...credentialEntry,
					name,
					...outsideAccess,
					reason: 'not-on-instance',
					consumers: [consumer(ALPHA, 'wf-1')],
				},
			]);
		},
	);

	it('names a credential without a file and without a requirement row by its id', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			issues: [credentialIssue('cred-1', ['wf-1'])],
		});

		expect(check.missingDependencies).toEqual([
			expect.objectContaining({ id: 'cred-1', name: 'cred-1' }),
		]);
	});

	it('lists a credential that the project cannot use, next to its access requirement', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			credentials: [credentialFile('cred-1', BETA.id, 'GitHub key')],
			issues: [credentialIssue('cred-1', ['wf-1'], { reason: 'access-required' })],
		});

		expect(check.accessRequirements).toEqual([
			expect.objectContaining({ code: 'access-required', sourceId: 'cred-1' }),
		]);
		expect(check.missingDependencies).toEqual([
			{
				...credentialEntry,
				...needsAction,
				reason: 'not-shared',
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
	});

	it.each([
		['type-mismatch', { kind: 'type_mismatch', actualType: 'gitlabApi' }],
		['unknown-type', { kind: 'unknown_type' }],
		['incompatible-usage-scope', { reason: 'incompatible-usage-scope' }],
	] as const)('lists a credential with the conflict %s, next to the conflict', (code, failure) => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id), usesCredential('wf-2', BETA.id)],
			credentials: [credentialFile('cred-1', ALPHA.id, 'GitHub key')],
			// An Apply of the whole instance raises the issue once for each project.
			issues: [
				credentialIssue('cred-1', ['wf-2'], failure),
				credentialIssue('cred-1', ['wf-1'], failure),
			],
		});

		expect(check.conflicts.map((conflict) => conflict.code)).toEqual([code, code]);
		expect(check.missingDependencies).toEqual([
			{
				...credentialEntry,
				...needsAction,
				reason: code,
				consumers: [consumer(ALPHA, 'wf-1'), consumer(BETA, 'wf-2')],
			},
		]);
	});

	it('does not list a reference without an id, or an id with two types', () => {
		const check = checkPackage({
			workflows: [
				workflow('wf-1', ALPHA.id, [
					credentialNode('No id', 'githubApi', null, 'Test GitHub'),
					credentialNode('As GitHub', 'githubApi', 'cred-1', 'Shared'),
					credentialNode('As GitLab', 'gitlabApi', 'cred-1', 'Shared'),
				]),
			],
			issues: [credentialIssue('cred-1', ['wf-1'])],
		});

		expect(check.conflicts.map((conflict) => conflict.code).sort()).toEqual([
			'conflicting-types',
			'missing-id',
		]);
		expect(check.missingDependencies).toEqual([]);
	});

	it('lists a missing variable next to its binding, and no variable without a definition or with a shadow', () => {
		const check = checkPackage(
			{
				workflows: [
					workflow('wf-a', ALPHA.id, [
						variableNode('Set', '={{ $vars.MISSING }} {{ $vars.UNDEFINED }} {{ $vars.SHADOWED }}'),
					]),
				],
				variables: [variableFile('MISSING', ALPHA.id), variableFile('SHADOWED', null)],
			},
			{ [ALPHA.id]: [{ name: 'SHADOWED', scopes: ['project', 'global'] }] },
		);

		expect(check.missingBindings).toEqual([
			expect.objectContaining({ kind: 'variable', name: 'MISSING' }),
		]);
		expect(check.conflicts.map((conflict) => conflict.code)).toEqual(['missing-definition']);
		expect(check.warnings.map((warning) => warning.code)).toEqual(['variable-shadowed']);
		expect(check.missingDependencies).toEqual([
			{
				kind: 'variable',
				name: 'MISSING',
				...needsAction,
				reason: 'not-on-instance',
				blocking: true,
				consumers: [consumer(ALPHA, 'wf-a')],
			},
		]);
	});

	it('lists a missing sub-workflow, which does not stop the Apply', () => {
		const check = checkPackage({
			workflows: [
				workflow('wf-1', ALPHA.id, [
					node('Call', {
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { workflowId: 'sub-1' },
					}),
				]),
			],
			dependencies: { appliedWorkflowIds: new Set(['wf-1']) },
		});

		expect(check.missingDependencies).toEqual([
			{
				kind: 'workflow',
				id: 'sub-1',
				name: 'sub-1',
				...outsideAccess,
				reason: 'not-on-instance',
				blocking: false,
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
		expect(check).toMatchObject({ missingBindings: [], accessRequirements: [], conflicts: [] });
	});

	it('gives the list in the same order for any order of the plan issues', () => {
		const input = (issues: BlockingIssue[]) => ({
			workflows: [
				workflow('wf-1', ALPHA.id, [
					credentialNode('B', 'githubApi', 'cred-b', 'B'),
					credentialNode('A', 'githubApi', 'cred-a', 'A'),
					variableNode('Set', '={{ $vars.ZONE }} {{ $vars.AREA }}'),
					node('Call', {
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { workflowId: 'sub-1' },
					}),
				]),
			],
			credentials: [
				credentialFile('cred-a', ALPHA.id, 'A'),
				credentialFile('cred-b', BETA.id, 'B'),
			],
			variables: [variableFile('ZONE', ALPHA.id), variableFile('AREA', null)],
			issues,
		});
		const issues = [
			credentialIssue('cred-a', ['wf-1']),
			credentialIssue('cred-b', ['wf-1']),
			credentialIssue('cred-b', ['wf-1'], { reason: 'access-required' }),
		];

		const check = checkPackage(input(issues));

		expect(
			check.missingDependencies.map(({ kind, id, name, reason }) => [kind, id ?? name, reason]),
		).toEqual([
			['credential', 'cred-a', 'not-on-instance'],
			['credential', 'cred-b', 'not-on-instance'],
			['credential', 'cred-b', 'not-shared'],
			['variable', 'AREA', 'not-on-instance'],
			['variable', 'ZONE', 'not-on-instance'],
			['workflow', 'sub-1', 'not-on-instance'],
		]);
		expect(checkPackage(input([...issues].reverse())).missingDependencies).toEqual(
			check.missingDependencies,
		);
	});
});
