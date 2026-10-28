import type { INode } from 'n8n-workflow';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import type {
	InventoryVariable,
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';

import { toPreviewCheck } from '../apply-preview';
import { collectCredentialReferences, collectVariableReferences } from '../package-references';

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

const consumer = (project: typeof ALPHA, ...ids: string[]) => ({
	project,
	workflows: ids.map((id) => ({ id, name: `Workflow ${id}` })),
});

/** Runs the reference scan on the package, as the preview does, then the Apply check. */
function checkPackage(
	{
		workflows,
		variables = [],
	}: { workflows: InventoryWorkflow[]; variables?: InventoryVariable[] },
	matched: Record<string, Array<{ name: string; scopes: Array<'project' | 'global'> }>> = {},
) {
	const inventory = {
		projects: [ALPHA, BETA].map((project) => ({ ...project, path: `projects/${project.id}` })),
		workflows,
		folders: [],
		credentials: [],
		variables,
		dataTables: [],
	} as unknown as PackageDirectoryInventory;
	const plan = {
		projectPlan: { items: [] },
		scopes: [ALPHA, BETA].map(({ id }) => ({
			project: { id },
			plan: { blockingIssues: [], variablePlan: { matched: matched[id] ?? [] } },
		})),
		issues: [],
	} as unknown as PackageImportPlan;

	return toPreviewCheck({
		plan,
		inventory,
		credentials: collectCredentialReferences(inventory),
		variables: collectVariableReferences(inventory, new VariableRequirementsExtractor()),
		moves: { workflows: [], folders: [] },
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
			moves: { workflows: [], folders: [] },
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
