import { BadRequestError } from '@n8n/errors';
import fc from 'fast-check';
import type { INode, INodeParameterResourceLocator, NodeParameterValueType } from 'n8n-workflow';

import { PackageExportBlockedError } from '../../entities/package-export.errors';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageRequirements } from '../../spec/requirements.schema';
import {
	assertNoArchivedWorkflow,
	assertNoSubWorkflowCalls,
	nodeTypeLabel,
	nodeTypeLabels,
	notCopiedVariablesWarning,
	notCopiedWorkflowWarnings,
	singleWorkflowEntry,
	staticSubWorkflowIds,
	summariseRequirements,
	uniqueSorted,
	workflowLabel,
} from '../package-requirements';

const entry = (id: string): ManifestEntry => ({
	id,
	name: `Workflow ${id}`,
	target: `workflows/${id}`,
});

const credential = (id: string, name: string, type: string) => ({
	id,
	name,
	type,
	usedByWorkflows: ['wf-source'],
});

/** A node that calls another workflow, in the stored forms that the editor writes. */
const callNode = (workflowId: NodeParameterValueType, overrides: Partial<INode> = {}): INode => ({
	id: `call-${String(workflowId)}`,
	name: `Call ${String(workflowId)}`,
	type: 'n8n-nodes-base.executeWorkflow',
	typeVersion: 1.2,
	position: [0, 0],
	parameters: { workflowId },
	...overrides,
});

const locator = (value: string): INodeParameterResourceLocator => ({
	__rl: true,
	mode: 'list',
	value,
});

describe('nodeTypeLabel', () => {
	it('joins the type and the version with "@"', () => {
		expect(nodeTypeLabel({ type: 'n8n-nodes-base.slack', typeVersion: 2.3 })).toBe(
			'n8n-nodes-base.slack@2.3',
		);
	});
});

describe('nodeTypeLabels', () => {
	it('gives sorted labels without duplicates', () => {
		expect(
			nodeTypeLabels([
				{ type: 'n8n-nodes-base.set', typeVersion: 3.4 },
				{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4 },
				{ type: 'n8n-nodes-base.set', typeVersion: 3.4 },
				{ type: 'n8n-nodes-base.httpRequest', typeVersion: 1 },
			]),
		).toEqual([
			'n8n-nodes-base.httpRequest@1',
			'n8n-nodes-base.httpRequest@4',
			'n8n-nodes-base.set@3.4',
		]);
	});

	it('gives no labels when there are no node types', () => {
		expect(nodeTypeLabels()).toEqual([]);
		expect(nodeTypeLabels([])).toEqual([]);
	});
});

describe('summariseRequirements', () => {
	it('gives empty requirements for a package without requirements', () => {
		expect(summariseRequirements(undefined)).toEqual({ nodeTypes: [], credentials: [] });
		expect(summariseRequirements({})).toEqual({ nodeTypes: [], credentials: [] });
	});

	it('lists node types and credentials, but not their ids or the workflows that use them', () => {
		const requirements: PackageRequirements = {
			credentials: [credential('c1', 'Stripe API', 'httpHeaderAuth')],
			nodeTypes: [
				{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, usedByWorkflows: ['wf-source'] },
			],
			variables: [{ name: 'API_URL', usedByWorkflows: ['wf-source'] }],
		};

		expect(summariseRequirements(requirements)).toEqual({
			nodeTypes: ['n8n-nodes-base.httpRequest@4.2'],
			credentials: [{ name: 'Stripe API', type: 'httpHeaderAuth' }],
		});
	});

	it('shows credentials with the same name and type once, as the import matches them so', () => {
		const { credentials } = summariseRequirements({
			credentials: [
				credential('c2', 'Stripe API', 'httpHeaderAuth'),
				credential('c1', 'Stripe API', 'httpHeaderAuth'),
				credential('c3', 'Stripe API', 'stripeApi'),
				credential('c4', 'Alpha', 'stripeApi'),
			],
		});

		expect(credentials).toEqual([
			{ name: 'Alpha', type: 'stripeApi' },
			{ name: 'Stripe API', type: 'httpHeaderAuth' },
			{ name: 'Stripe API', type: 'stripeApi' },
		]);
	});

	it('lists each name and type once and in order (property)', () => {
		const name = fc.constantFrom('Stripe', 'Slack', 'Mail', 'Slack bot');
		const type = fc.constantFrom('httpHeaderAuth', 'slackApi', 'smtp');
		fc.assert(
			fc.property(fc.array(fc.tuple(name, type), { maxLength: 20 }), (pairs) => {
				const requirements: PackageRequirements = {
					credentials: pairs.map(([n, t], index) => credential(`c${index}`, n, t)),
				};

				const listed = summariseRequirements(requirements).credentials.map((c) => [c.name, c.type]);

				const expected = [...new Set(pairs.map((pair) => JSON.stringify(pair)))]
					.map((key) => JSON.parse(key) as [string, string])
					.sort(([n1, t1], [n2, t2]) => n1.localeCompare(n2) || t1.localeCompare(t2));
				expect(listed).toEqual(expected);
			}),
		);
	});
});

describe('singleWorkflowEntry', () => {
	it('gives the one workflow of a workflow package', () => {
		expect(singleWorkflowEntry({ workflows: [entry('wf-1')] })).toEqual(entry('wf-1'));
	});

	it('accepts the workflow when its source id is the expected one', () => {
		expect(singleWorkflowEntry({ workflows: [entry('wf-1')] }, 'wf-1')).toEqual(entry('wf-1'));
	});

	it('rejects a package that contains another workflow than the expected one', () => {
		const check = () => singleWorkflowEntry({ workflows: [entry('wf-1')] }, 'wf-2');

		expect(check).toThrow(BadRequestError);
		expect(check).toThrow('The package contains workflow "wf-1", not workflow "wf-2".');
	});

	it.each([
		{ case: 'no workflows', manifest: { workflows: [] }, counts: [0, 0, 0] },
		{ case: 'no workflow list', manifest: {}, counts: [0, 0, 0] },
		{
			case: 'two workflows',
			manifest: { workflows: [entry('wf-1'), entry('wf-2')] },
			counts: [2, 0, 0],
		},
		{
			case: 'a folder',
			manifest: { workflows: [entry('wf-1')], folders: [entry('f-1')] },
			counts: [1, 1, 0],
		},
		{
			case: 'a project',
			manifest: { workflows: [entry('wf-1')], projects: [entry('p-1')] },
			counts: [1, 0, 1],
		},
		{ case: 'only a project', manifest: { projects: [entry('p-1')] }, counts: [0, 0, 1] },
		{
			case: 'folders and projects',
			manifest: { workflows: [entry('wf-1')], folders: [entry('f-1'), entry('f-2')], projects: [] },
			counts: [1, 2, 0],
		},
	])('rejects a package with $case', ({ manifest, counts: [workflows, folders, projects] }) => {
		const check = () => singleWorkflowEntry(manifest);

		expect(check).toThrow(BadRequestError);
		expect(check).toThrow(
			`The package must contain exactly one workflow and no folders or projects, but it contains ${workflows} workflow(s), ${folders} folder(s) and ${projects} project(s). Use a package from export_workflow_package.`,
		);
	});

	it('accepts empty folder and project lists', () => {
		expect(singleWorkflowEntry({ workflows: [entry('wf-1')], folders: [], projects: [] })).toEqual(
			entry('wf-1'),
		);
	});
});

describe('staticSubWorkflowIds', () => {
	const workflow = (nodes: INode[]) => ({ id: 'wf-self', nodes });

	it('gives the workflows that nodes call by a fixed ID, sorted and once each', () => {
		expect(
			staticSubWorkflowIds(
				workflow([
					callNode('wf-b'),
					callNode(locator('wf-a')),
					callNode('wf-b', { id: 'second', name: 'Call wf-b again' }),
					callNode(locator('wf-c'), { type: '@n8n/n8n-nodes-langchain.toolWorkflow' }),
				]),
			),
		).toEqual(['wf-a', 'wf-b', 'wf-c']);
	});

	it('leaves out a call of the workflow itself, which is in the package', () => {
		expect(staticSubWorkflowIds(workflow([callNode('wf-self'), callNode('wf-a')]))).toEqual([
			'wf-a',
		]);
	});

	it.each([
		['an expression', callNode('={{ $json.workflowId }}')],
		['an empty ID', callNode('')],
		[
			'a workflow given as JSON',
			callNode('wf-a', { parameters: { source: 'parameter', workflowId: 'wf-a' } }),
		],
		['another node type', callNode('wf-a', { type: 'n8n-nodes-base.set' })],
	])('leaves out %s', (_case, node) => {
		expect(staticSubWorkflowIds(workflow([node]))).toEqual([]);
	});

	it('gives nothing for a workflow without nodes', () => {
		expect(staticSubWorkflowIds({ id: 'wf-self', nodes: [] })).toEqual([]);
		expect(staticSubWorkflowIds({ id: 'wf-self', nodes: undefined as unknown as INode[] })).toEqual(
			[],
		);
	});
});

describe('assertNoSubWorkflowCalls', () => {
	it('accepts a workflow that calls no other workflow by ID', () => {
		expect(() =>
			assertNoSubWorkflowCalls({ id: 'wf-self', nodes: [callNode('wf-self')] }),
		).not.toThrow();
	});

	it('stops the export and names each sub-workflow', () => {
		const check = () =>
			assertNoSubWorkflowCalls({
				id: 'wf-self',
				nodes: [callNode('wf-b'), callNode(locator('wf-a'))],
			});

		expect(check).toThrow(PackageExportBlockedError);
		expect(check).toThrow(
			expect.objectContaining({
				message:
					'The workflow calls 2 sub-workflow(s) by a fixed ID, and a package holds one workflow only. Export aborted.',
				description: 'Sub-workflow IDs: wf-a, wf-b',
			}),
		);
	});
});

describe('uniqueSorted', () => {
	it('gives each value once, in sort order', () => {
		expect(uniqueSorted(['b', 'a', 'b', 'c', 'a'])).toEqual(['a', 'b', 'c']);
		expect(uniqueSorted([])).toEqual([]);
	});
});

describe('workflowLabel', () => {
	it('gives the name and the ID, or only the ID when the name is not known', () => {
		expect(workflowLabel({ id: 'wf-err', name: 'Alert the team' })).toBe(
			'"Alert the team" (wf-err)',
		);
		expect(workflowLabel({ id: 'wf-err' })).toBe('"wf-err"');
	});
});

describe('notCopiedWorkflowWarnings', () => {
	const errorWorkflowWarning = (label: string) =>
		`The package does not hold the error workflow ${label}. A new copy keeps the link only if the user who imports it can use that workflow there. Otherwise, choose an error workflow in the settings of the copy.`;

	it('names the error workflow, which the package does not copy', () => {
		expect(notCopiedWorkflowWarnings([{ id: 'wf-err', name: 'Alert the team' }], 'wf-err')).toEqual(
			[errorWorkflowWarning('"Alert the team" (wf-err)')],
		);
	});

	it('names a workflow by its ID when its name is not known', () => {
		expect(notCopiedWorkflowWarnings([{ id: 'wf-err' }], 'wf-err')).toEqual([
			errorWorkflowWarning('"wf-err"'),
		]);
	});

	it('names any other workflow that the package refers to', () => {
		expect(
			notCopiedWorkflowWarnings(
				[
					{ id: 'wf-other', name: 'Other' },
					{ id: 'wf-err', name: 'Alert the team' },
				],
				'wf-err',
			),
		).toEqual([
			'The package refers to workflow "Other" (wf-other), but does not hold it.',
			errorWorkflowWarning('"Alert the team" (wf-err)'),
		]);
		expect(notCopiedWorkflowWarnings([{ id: 'wf-other' }], undefined)).toEqual([
			'The package refers to workflow "wf-other", but does not hold it.',
		]);
	});

	it('gives no warnings when the package refers to no other workflow', () => {
		expect(notCopiedWorkflowWarnings(undefined, 'wf-err')).toEqual([]);
		expect(notCopiedWorkflowWarnings([], undefined)).toEqual([]);
	});
});

describe('notCopiedVariablesWarning', () => {
	it('names the variables once each and in order, without values', () => {
		expect(
			notCopiedVariablesWarning([{ name: 'API_URL' }, { name: 'ACCOUNT_ID' }, { name: 'API_URL' }]),
		).toBe(
			'The workflow uses 2 variable(s): ACCOUNT_ID, API_URL. The package holds their names, but not their values. Make sure that the instance that imports the package has them.',
		);
	});

	it('gives no warning when the workflow uses no variables', () => {
		expect(notCopiedVariablesWarning([])).toBeUndefined();
		expect(notCopiedVariablesWarning()).toBeUndefined();
	});
});

describe('assertNoArchivedWorkflow', () => {
	it('accepts workflows that are not archived', () => {
		expect(() =>
			assertNoArchivedWorkflow([{ sourceArchived: false }, { sourceArchived: false }]),
		).not.toThrow();
		expect(() => assertNoArchivedWorkflow([])).not.toThrow();
	});

	it('rejects a package with an archived workflow', () => {
		const check = () =>
			assertNoArchivedWorkflow([{ sourceArchived: false }, { sourceArchived: true }]);

		expect(check).toThrow(BadRequestError);
		expect(check).toThrow(
			'The package holds an archived workflow. Restore the workflow, then export it again.',
		);
	});
});
