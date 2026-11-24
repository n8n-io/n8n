import {
	promotionPreviewCheckSchema,
	type PromotionApplyCheck,
	type PromotionBindingConflict,
	type PromotionMissingDependency,
} from '@n8n/api-types';
import type { INode, INodeCredentialsDetails } from 'n8n-workflow';

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
import { credentialsLeftUnresolved, stopsApply, toPreviewCheck } from '../apply-preview';
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
	unusableCredentials: new Map(),
	appliedWorkflowIds: new Set(),
	removedWorkflowIds: new Set(),
	selectableWorkflowIds: new Set(),
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

	const check = toPreviewCheck({
		plan,
		inventory,
		credentials: collectCredentialReferences(inventory),
		variables: collectVariableReferences(inventory, new VariableRequirementsExtractor()),
		workflows: collectWorkflowReferences(inventory),
		moves: { workflows: [], folders: [] },
		dependencies: { ...NO_ACCESS, ...dependencies },
	});
	// Each route parses the check with this schema before it answers.
	promotionPreviewCheckSchema.parse(check);
	return check;
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

	it('lists a missing credential of a project that the user cannot access, without its binding, and does not stop on it', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			credentials: [credentialFile('cred-1', BETA.id, 'GitHub key')],
			// The import gives no reason to a user who cannot read all credentials.
			issues: [credentialIssue('cred-1', ['wf-1'], { reason: undefined })],
		});

		expect(check.missingBindings).toEqual([]);
		expect(check.conflicts).toEqual([]);
		expect(check.missingDependencies).toEqual([
			{
				...credentialEntry,
				...outsideAccess,
				reason: 'not-on-instance',
				blocking: false,
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
		'lists a missing credential with %s only in the list as not on the branch, reports no conflict, and does not stop on it',
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
					reason: 'not-on-branch',
					blocking: false,
					consumers: [consumer(ALPHA, 'wf-1')],
				},
			]);
			// The Apply needs the confirmation, then it leaves the reference as it is.
			expect(stopsApply(check, { destructiveChanges: true, missingDependencies: false })).toBe(
				true,
			);
			expect(stopsApply(check, { destructiveChanges: false, missingDependencies: true })).toBe(
				false,
			);
			expect(credentialsLeftUnresolved(check)).toEqual(['cred-1']);
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

	describe.each([
		[
			'the name of its requirement row',
			{
				credentials: [
					{
						id: 'cred-1',
						name: 'Row name',
						type: 'githubApi',
						usedBy: [{ kind: 'workflow' as const, id: 'wf-1' }],
					},
				],
			},
			'Row name',
		],
		['its id, when no requirement row names it', {}, 'cred-1'],
	])(
		'a credential that this instance holds, without a file on the branch, takes %s',
		(_case, requirements, name) => {
			/** A workflow file of a branch holds the id of a credential, without its name. */
			const usesCredentialOfBranch = (id: string) =>
				workflow(id, ALPHA.id, [
					node('Request', {
						credentials: { githubApi: { id: 'cred-1' } as INodeCredentialsDetails },
					}),
				]);
			const checkWithIssue = (
				failure: Partial<Extract<BlockingIssue, { type: 'credential-unresolved' }>>,
			) =>
				checkPackage({
					workflows: [usesCredentialOfBranch('wf-1')],
					requirements,
					issues: [credentialIssue('cred-1', ['wf-1'], failure)],
				});

			it('in the access requirement of a credential that the project cannot use', () => {
				const check = checkWithIssue({ reason: 'access-required' });

				expect(check.accessRequirements).toEqual([
					{
						kind: 'credential',
						code: 'access-required',
						sourceId: 'cred-1',
						name,
						credentialType: 'githubApi',
						consumers: [consumer(ALPHA, 'wf-1')],
					},
				]);
				expect(check.missingDependencies).toEqual([
					{
						...credentialEntry,
						name,
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
			] as const)('in the conflict %s', (code, failure) => {
				const check = checkWithIssue(failure);

				expect(check.conflicts).toEqual([
					expect.objectContaining({ kind: 'credential', code, sourceId: 'cred-1', name }),
				]);
				expect(check.missingDependencies).toEqual([
					expect.objectContaining({ id: 'cred-1', name, reason: code }),
				]);
			});

			it('in the conflict of an id that the workflows use with two types', () => {
				const check = checkPackage({
					workflows: [
						workflow('wf-1', ALPHA.id, [
							node('Request', {
								credentials: {
									githubApi: { id: 'cred-1' } as INodeCredentialsDetails,
									gitlabApi: { id: 'cred-1' } as INodeCredentialsDetails,
								},
							}),
						]),
					],
					requirements,
				});

				expect(check.conflicts).toEqual([
					expect.objectContaining({ code: 'conflicting-types', sourceId: 'cred-1', name }),
				]);
			});
		},
	);

	it('gives an empty name to a reference without an id when the workflow file holds no name', () => {
		const check = checkPackage({
			workflows: [
				workflow('wf-1', ALPHA.id, [
					node('Request', {
						credentials: { githubApi: { id: null } as INodeCredentialsDetails },
					}),
				]),
			],
		});

		expect(check.conflicts).toEqual([
			expect.objectContaining({ code: 'missing-id', sourceId: null, name: '' }),
		]);
	});

	it.each([
		['project', 'not-shared'],
		['instance', 'incompatible-usage-scope'],
	] as const)(
		'stops on a credential that this instance holds with the usage scope %s, for a user who gets no reason from the import',
		(usageScope, reason) => {
			const check = checkPackage({
				workflows: [usesCredential('wf-1', ALPHA.id)],
				credentials: [credentialFile('cred-1', BETA.id, 'GitHub key')],
				requirements: {
					credentials: [
						{
							id: 'cred-1',
							type: 'githubApi',
							// A marker of Promote does not change the rule for a credential that exists here.
							reason: 'missing-on-source',
							usedBy: [{ kind: 'workflow', id: 'wf-1' }],
						},
					],
				},
				issues: [credentialIssue('cred-1', ['wf-1'], { reason: undefined })],
				// The user can create credentials in Beta, but this id is taken.
				dependencies: {
					credentialProjectIds: new Set([BETA.id]),
					unusableCredentials: new Map([['cred-1', usageScope]]),
				},
			});

			expect(check).toMatchObject({
				missingBindings: [],
				accessRequirements: [],
				conflicts: [],
				warnings: [],
			});
			expect(check.missingDependencies).toEqual([
				{ ...credentialEntry, ...outsideAccess, reason, consumers: [consumer(ALPHA, 'wf-1')] },
			]);
		},
	);

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

	it('lists a sub-workflow that the package and this instance lack, which does not stop the Apply', () => {
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
				reason: 'not-on-branch',
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
			['workflow', 'sub-1', 'not-on-branch'],
		]);
		expect(checkPackage(input([...issues].reverse())).missingDependencies).toEqual(
			check.missingDependencies,
		);
	});

	it('gives a condition to a workflow entry of an open selection, and orders the two conditions', () => {
		const calls = (id: string, workflowId: string) =>
			workflow(id, ALPHA.id, [
				node('Call', { type: 'n8n-nodes-base.executeWorkflow', parameters: { workflowId } }),
			]);
		const archived = {
			...workflow('sub-1', ALPHA.id, []),
			content: { name: 'Workflow sub-1', nodes: [], connections: {}, isArchived: true },
		} as unknown as InventoryWorkflow;

		const check = checkPackage({
			workflows: [calls('wf-1', 'sub-1'), archived],
			dependencies: {
				appliedWorkflowIds: new Set(['wf-1', 'sub-1']),
				selectableWorkflowIds: new Set(['wf-1', 'sub-1']),
				instanceWorkflows: new Map([
					['sub-1', { isArchived: false, settings: { callerPolicy: 'none' }, projectId: ALPHA.id }],
				]),
			},
		});

		const entry = {
			kind: 'workflow',
			id: 'sub-1',
			name: 'sub-1',
			...needsAction,
			blocking: false,
			consumers: [consumer(ALPHA, 'wf-1')],
		};
		expect(check.missingDependencies).toEqual([
			{ ...entry, reason: 'archived', condition: 'target-selected' },
			{ ...entry, reason: 'caller-policy', condition: 'target-not-selected' },
		]);
		expect(check).toMatchObject({ missingBindings: [], accessRequirements: [], conflicts: [] });
	});
});

describe('toPreviewCheck: references that Promote marked as broken on the source instance', () => {
	const usesCredential = (id: string, projectId: string, credentialId = 'cred-1') =>
		workflow(id, projectId, [credentialNode('Request', 'githubApi', credentialId, 'Node name')]);
	const callsWorkflow = (id: string, projectId: string, calledId = 'sub-1') =>
		workflow(id, projectId, [
			node('Call', {
				type: 'n8n-nodes-base.executeWorkflow',
				parameters: { workflowId: calledId },
			}),
		]);
	const row = (
		id: string,
		workflowIds: string[],
		reason?: 'confirmed-missing' | 'missing-on-source',
	) => ({
		id,
		name: `Row ${id}`,
		...(reason ? { reason } : {}),
		usedBy: workflowIds.map((workflowId) => ({ kind: 'workflow' as const, id: workflowId })),
	});

	it('reports a marked credential that this instance does not hold as a warning, not as a missing dependency', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id), usesCredential('wf-2', BETA.id)],
			requirements: {
				credentials: [
					{ ...row('cred-1', ['wf-1', 'wf-2'], 'missing-on-source'), type: 'githubApi' },
				],
			},
			// An Apply of the whole instance raises the issue once for each project.
			issues: [credentialIssue('cred-1', ['wf-2']), credentialIssue('cred-1', ['wf-1'])],
		});

		expect(check.warnings).toEqual([
			{
				kind: 'credential',
				code: 'missing-on-source',
				id: 'cred-1',
				name: 'Row cred-1',
				consumers: [consumer(ALPHA, 'wf-1'), consumer(BETA, 'wf-2')],
			},
		]);
		expect(check).toMatchObject({
			missingDependencies: [],
			missingBindings: [],
			accessRequirements: [],
			conflicts: [],
		});
	});

	it('reports a marked credential that the branch holds without an owner project as a warning, and leaves it unresolved without a confirmation', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			credentials: [credentialFile('cred-1', null, 'GitHub key')],
			requirements: {
				credentials: [{ ...row('cred-1', ['wf-1'], 'missing-on-source'), type: 'githubApi' }],
			},
			issues: [credentialIssue('cred-1', ['wf-1'])],
		});

		expect(check.warnings).toEqual([
			{
				kind: 'credential',
				code: 'missing-on-source',
				id: 'cred-1',
				name: 'GitHub key',
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
		expect(check.missingDependencies).toEqual([]);
		expect(stopsApply(check, { destructiveChanges: false, missingDependencies: false })).toBe(
			false,
		);
		expect(credentialsLeftUnresolved(check)).toEqual(['cred-1']);
	});

	it.each([['confirmed-missing'], [undefined]] as const)(
		'keeps a credential whose row has the reason %s as a missing dependency',
		(reason) => {
			const check = checkPackage({
				workflows: [usesCredential('wf-1', ALPHA.id)],
				requirements: {
					credentials: [{ ...row('cred-1', ['wf-1'], reason), type: 'githubApi' }],
				},
				issues: [credentialIssue('cred-1', ['wf-1'])],
			});

			expect(check.warnings).toEqual([]);
			expect(check.missingDependencies).toEqual([
				expect.objectContaining({ kind: 'credential', id: 'cred-1', blocking: false }),
			]);
		},
	);

	it('keeps a marked credential with another blocker in the lists that stop the Apply', () => {
		const check = checkPackage({
			workflows: [usesCredential('wf-1', ALPHA.id)],
			requirements: {
				credentials: [{ ...row('cred-1', ['wf-1'], 'missing-on-source'), type: 'githubApi' }],
			},
			issues: [credentialIssue('cred-1', ['wf-1'], { reason: 'access-required' })],
		});

		expect(check.warnings).toEqual([]);
		expect(check.accessRequirements).toHaveLength(1);
		expect(check.missingDependencies).toEqual([
			expect.objectContaining({ id: 'cred-1', reason: 'not-shared', blocking: true }),
		]);
	});

	it('reports a marked sub-workflow that the workflows cannot use as a warning, and an unmarked one as a missing dependency', () => {
		const check = checkPackage({
			workflows: [callsWorkflow('wf-1', ALPHA.id), callsWorkflow('wf-2', ALPHA.id, 'sub-2')],
			requirements: {
				workflows: [
					row('sub-1', ['wf-1'], 'missing-on-source'),
					row('sub-2', ['wf-2'], 'confirmed-missing'),
				],
			},
			dependencies: { appliedWorkflowIds: new Set(['wf-1', 'wf-2']) },
		});

		expect(check.warnings).toEqual([
			{
				kind: 'workflow',
				code: 'missing-on-source',
				id: 'sub-1',
				name: 'Row sub-1',
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
		expect(check.missingDependencies).toEqual([
			expect.objectContaining({ kind: 'workflow', id: 'sub-2', blocking: false }),
		]);
	});

	it('reports one warning for a marked sub-workflow whose entries depend on the selection', () => {
		const archived = {
			...workflow('sub-1', ALPHA.id, []),
			content: { name: 'Workflow sub-1', nodes: [], connections: {}, isArchived: true },
		} as unknown as InventoryWorkflow;

		// The branch archives the sub-workflow. This instance holds it with a caller policy that
		// refuses the caller. So the preview of the project has one entry for each selection.
		const check = checkPackage({
			workflows: [callsWorkflow('wf-1', ALPHA.id), archived],
			requirements: { workflows: [row('sub-1', ['wf-1'], 'missing-on-source')] },
			dependencies: {
				appliedWorkflowIds: new Set(['wf-1', 'sub-1']),
				selectableWorkflowIds: new Set(['wf-1', 'sub-1']),
				instanceWorkflows: new Map([
					['sub-1', { isArchived: false, settings: { callerPolicy: 'none' }, projectId: ALPHA.id }],
				]),
			},
		});

		expect(check.warnings).toEqual([
			{
				kind: 'workflow',
				code: 'missing-on-source',
				id: 'sub-1',
				name: 'Row sub-1',
				consumers: [consumer(ALPHA, 'wf-1')],
			},
		]);
		expect(check.missingDependencies).toEqual([]);
	});

	it('reports no warning for a marked sub-workflow that the workflows can use here', () => {
		const check = checkPackage({
			workflows: [callsWorkflow('wf-1', ALPHA.id)],
			requirements: { workflows: [row('sub-1', ['wf-1'], 'missing-on-source')] },
			dependencies: {
				appliedWorkflowIds: new Set(['wf-1']),
				instanceWorkflows: new Map([['sub-1', { isArchived: false, projectId: ALPHA.id }]]),
			},
		});

		expect(check.warnings).toEqual([]);
		expect(check.missingDependencies).toEqual([]);
	});

	it('gives the warnings in the same order for any order of the plan issues', () => {
		const input = (issues: BlockingIssue[]) => ({
			workflows: [
				workflow('wf-1', ALPHA.id, [
					credentialNode('B', 'githubApi', 'cred-b', 'B'),
					credentialNode('A', 'githubApi', 'cred-a', 'A'),
					node('Call', {
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { workflowId: 'sub-1' },
					}),
				]),
			],
			requirements: {
				credentials: [
					{ ...row('cred-b', ['wf-1'], 'missing-on-source'), type: 'githubApi' },
					{ ...row('cred-a', ['wf-1'], 'missing-on-source'), type: 'githubApi' },
				],
				workflows: [row('sub-1', ['wf-1'], 'missing-on-source')],
			},
			issues,
			dependencies: { appliedWorkflowIds: new Set(['wf-1']) },
		});
		const issues = [credentialIssue('cred-b', ['wf-1']), credentialIssue('cred-a', ['wf-1'])];

		const check = checkPackage(input(issues));

		expect(check.warnings.map((warning) => ('id' in warning ? warning.id : warning.name))).toEqual([
			'cred-a',
			'cred-b',
			'sub-1',
		]);
		expect(checkPackage(input([...issues].reverse())).warnings).toEqual(check.warnings);
	});
});

describe('stopsApply', () => {
	const entry = (
		blocking: boolean,
		kind: PromotionMissingDependency['kind'] = 'credential',
		id = 'cred-1',
	): PromotionMissingDependency => ({
		kind,
		id,
		name: 'Name',
		group: blocking ? 'needs-action' : 'outside-access',
		reason: 'not-on-instance',
		accessible: blocking,
		blocking,
		consumers: [consumer(ALPHA, 'wf-1')],
	});
	const checkWith = (overrides: Partial<PromotionApplyCheck> = {}): PromotionApplyCheck => ({
		missingProjects: [],
		missingBindings: [],
		accessRequirements: [],
		conflicts: [],
		warnings: [],
		missingDependencies: [],
		...overrides,
	});
	const projectDeletion: PromotionBindingConflict = {
		kind: 'project',
		code: 'project-deletion',
		project: ALPHA,
	};
	const confirmationStates = [
		{ destructiveChanges: false, missingDependencies: false },
		{ destructiveChanges: true, missingDependencies: false },
		{ destructiveChanges: false, missingDependencies: true },
		{ destructiveChanges: true, missingDependencies: true },
	];

	it.each(confirmationStates)(
		'stops on an entry that stops the Apply, with the confirmations %j',
		(confirmations) => {
			expect(stopsApply(checkWith({ missingDependencies: [entry(true)] }), confirmations)).toBe(
				true,
			);
		},
	);

	it.each(confirmationStates)(
		'stops on an entry that does not stop the Apply only without its confirmation, with the confirmations %j',
		(confirmations) => {
			for (const kind of ['credential', 'workflow'] as const) {
				expect(
					stopsApply(checkWith({ missingDependencies: [entry(false, kind)] }), confirmations),
				).toBe(!confirmations.missingDependencies);
			}
		},
	);

	it.each(confirmationStates)(
		'stops on a deletion of a project only without its confirmation, with the confirmations %j',
		(confirmations) => {
			expect(stopsApply(checkWith({ conflicts: [projectDeletion] }), confirmations)).toBe(
				!confirmations.destructiveChanges,
			);
		},
	);

	it.each(confirmationStates)(
		'continues past a deletion of a project and a missing dependency only with both confirmations, with the confirmations %j',
		(confirmations) => {
			const check = checkWith({
				conflicts: [projectDeletion],
				missingDependencies: [entry(false)],
			});

			expect(stopsApply(check, confirmations)).toBe(
				!(confirmations.destructiveChanges && confirmations.missingDependencies),
			);
		},
	);

	it('never stops on a warning', () => {
		const check = checkWith({
			warnings: [
				{
					kind: 'credential',
					code: 'missing-on-source',
					id: 'cred-1',
					name: 'Name',
					consumers: [consumer(ALPHA, 'wf-1')],
				},
			],
		});

		expect(stopsApply(check, { destructiveChanges: false, missingDependencies: false })).toBe(
			false,
		);
	});

	it('stops on the other blockers with both confirmations', () => {
		const both = { destructiveChanges: true, missingDependencies: true };
		const accessRequirement: PromotionApplyCheck['accessRequirements'][number] = {
			kind: 'credential',
			code: 'access-required',
			sourceId: 'cred-1',
			name: 'Name',
			credentialType: 'githubApi',
			consumers: [consumer(ALPHA, 'wf-1')],
		};
		const moved: PromotionBindingConflict = {
			kind: 'workflow',
			code: 'moved',
			id: 'wf-1',
			name: 'Workflow wf-1',
			project: ALPHA,
			projectExists: true,
			instanceProject: BETA,
		};

		expect(stopsApply(checkWith({ accessRequirements: [accessRequirement] }), both)).toBe(true);
		expect(stopsApply(checkWith({ conflicts: [moved] }), both)).toBe(true);
		expect(stopsApply(checkWith(), both)).toBe(false);
	});
});

describe('credentialsLeftUnresolved', () => {
	it('gives the credentials that the Apply continues without, once each and in order', () => {
		const dependency = (
			kind: PromotionMissingDependency['kind'],
			id: string,
			blocking: boolean,
		): PromotionMissingDependency => ({
			kind,
			id,
			name: id,
			group: 'outside-access',
			reason: 'not-on-instance',
			accessible: false,
			blocking,
			consumers: [consumer(ALPHA, 'wf-1')],
		});
		const warning = (kind: 'credential' | 'workflow', id: string) => ({
			kind,
			code: 'missing-on-source' as const,
			id,
			name: id,
			consumers: [consumer(ALPHA, 'wf-1')],
		});

		const ids = credentialsLeftUnresolved({
			missingProjects: [],
			missingBindings: [],
			accessRequirements: [],
			conflicts: [],
			warnings: [
				warning('credential', 'cred-broken'),
				warning('workflow', 'sub-broken'),
				{
					kind: 'variable',
					code: 'variable-shadowed',
					name: 'ZONE',
					scope: { kind: 'global' },
					consumers: [consumer(ALPHA, 'wf-1')],
				},
			],
			missingDependencies: [
				dependency('credential', 'cred-outside', false),
				dependency('credential', 'cred-outside', false),
				dependency('credential', 'cred-to-create', true),
				dependency('workflow', 'sub-missing', false),
			],
		});

		expect(ids).toEqual(['cred-broken', 'cred-outside']);
	});
});
