import { UnexpectedError } from '@n8n/errors';

import type { ImportedWorkflowSummary, ImportResult } from '../../n8n-packages.types';
import type { PackageRequirements } from '../../spec/requirements.schema';
import { credentialsNeedingSetup, importWarnings, summariseImport } from '../import-summary';

const credential = (id: string, name: string, type: string) => ({
	id,
	name,
	type,
	usedByWorkflows: ['wf-source'],
});

const importedWorkflow = (
	overrides: Partial<ImportedWorkflowSummary> = {},
): ImportedWorkflowSummary => ({
	sourceWorkflowId: 'wf-source',
	localId: 'wf-local',
	name: 'Daily report',
	projectId: 'project-1',
	parentFolderId: null,
	activeVersionId: null,
	isArchived: false,
	publishing: { state: 'unchanged' },
	status: 'created',
	...overrides,
});

type ImportOutcome = Pick<
	ImportResult,
	'workflows' | 'credentials' | 'bindings' | 'tags' | 'dataTables' | 'variables'
>;

const noTags = { matched: [], created: [], renamed: [], reconciled: [], skipped: [] };

const noVariables = { matched: [], missing: [], created: [], stubbed: [], updated: [] };

const importResult = (overrides: Partial<ImportOutcome> = {}): ImportOutcome => ({
	workflows: [importedWorkflow()],
	credentials: { matched: [], stubbed: [] },
	bindings: { workflows: {}, credentials: {} },
	tags: noTags,
	dataTables: { matched: 0, created: 0 },
	variables: noVariables,
	...overrides,
});

describe('credentialsNeedingSetup', () => {
	const requirements: PackageRequirements = {
		credentials: [
			credential('src-stripe', 'Stripe API', 'httpHeaderAuth'),
			credential('src-slack', 'Slack', 'slackApi'),
			credential('src-mail', 'Mail', 'smtp'),
		],
	};

	it('lists the stubs that the import created, with their new ids', () => {
		const result = importResult({
			credentials: { matched: ['src-slack'], stubbed: ['src-stripe', 'src-mail'] },
			bindings: {
				workflows: {},
				credentials: {
					'src-stripe': 'new-stripe',
					'src-slack': 'own-slack',
					'src-mail': 'new-mail',
				},
			},
		});

		expect(credentialsNeedingSetup(result, requirements)).toEqual([
			{ name: 'Stripe API', type: 'httpHeaderAuth', id: 'new-stripe' },
			{ name: 'Mail', type: 'smtp', id: 'new-mail' },
		]);
	});

	it('lists nothing when every credential matched one on this instance', () => {
		const result = importResult({
			credentials: { matched: ['src-stripe'], stubbed: [] },
			bindings: { workflows: {}, credentials: { 'src-stripe': 'own-stripe' } },
		});

		expect(credentialsNeedingSetup(result, requirements)).toEqual([]);
	});

	it('leaves out a stub without a new id or without a requirement', () => {
		const result = importResult({
			credentials: { matched: [], stubbed: ['src-stripe', 'src-unknown'] },
			bindings: { workflows: {}, credentials: { 'src-unknown': 'new-unknown' } },
		});

		expect(credentialsNeedingSetup(result, requirements)).toEqual([]);
		expect(credentialsNeedingSetup(result, undefined)).toEqual([]);
	});
});

describe('importWarnings', () => {
	const dataTable = (id: string, name: string) => ({ id, name, usedByWorkflows: ['wf-source'] });

	const outcome = (overrides: Partial<ImportOutcome> = {}) => {
		const { workflows: _workflows, ...rest } = importResult(overrides);
		return rest;
	};

	it('gives no warnings when the import added every tag and created no data table', () => {
		expect(
			importWarnings(
				outcome({
					tags: { ...noTags, matched: ['Finance'] },
					dataTables: { matched: 2, created: 0 },
				}),
				{ dataTables: [dataTable('dt-1', 'Leads'), dataTable('dt-2', 'Orders')] },
			),
		).toEqual([]);
	});

	it('names the tags that the import did not add, sorted and once each', () => {
		expect(
			importWarnings(outcome({ tags: { ...noTags, skipped: ['Sales', 'Finance', 'Sales'] } }), {}),
		).toEqual([
			'The import did not add 2 tag(s), because this instance does not have them: Finance, Sales.',
		]);
	});

	it('says that new data tables are empty', () => {
		expect(
			importWarnings(outcome({ dataTables: { matched: 0, created: 1 } }), {
				dataTables: [dataTable('dt-1', 'Leads')],
			}),
		).toEqual([
			'The import created 1 empty data table(s) for the workflow. The package holds no rows.',
		]);
	});

	it('names the data tables of the workflow when the import neither found nor created them', () => {
		expect(
			importWarnings(outcome(), {
				dataTables: [dataTable('dt-2', 'Orders'), dataTable('dt-1', 'Leads')],
			}),
		).toEqual([
			'2 of the 2 data table(s) that the workflow uses are not in the target project, and the import did not create them. The workflow uses: Leads, Orders. Create the missing tables, then select them in the workflow.',
		]);
	});

	it('counts only the data tables that the import did not find or create', () => {
		const warnings = importWarnings(outcome({ dataTables: { matched: 1, created: 1 } }), {
			dataTables: [
				dataTable('dt-1', 'Leads'),
				dataTable('dt-2', 'Orders'),
				dataTable('dt-3', 'Leads'),
			],
		});

		expect(warnings).toEqual([
			'The import created 1 empty data table(s) for the workflow. The package holds no rows.',
			'1 of the 3 data table(s) that the workflow uses are not in the target project, and the import did not create them. The workflow uses: Leads, Orders. Create the missing tables, then select them in the workflow.',
		]);
	});

	it('gives no data table warning when the package needs no data tables', () => {
		expect(importWarnings(outcome(), {})).toEqual([]);
		expect(importWarnings(outcome(), undefined)).toEqual([]);
	});

	it('names the variables that this instance does not have, sorted and once each', () => {
		const variables = {
			...noVariables,
			matched: ['REGION'],
			missing: ['API_URL', 'ACCOUNT_ID', 'API_URL'],
		};

		expect(importWarnings(outcome({ variables }), undefined)).toEqual([
			'The workflow uses 2 variable(s) that this instance does not have: ACCOUNT_ID, API_URL. Create them before the workflow runs.',
		]);
	});

	it('names the existing credentials that the import bound by name and type', () => {
		const result = outcome({
			credentials: { matched: ['src-slack', 'src-header'], stubbed: ['src-stripe'] },
			bindings: {
				workflows: {},
				credentials: { 'src-slack': 'own-slack', 'src-header': 'own-header', 'src-stripe': 'new' },
			},
		});
		const requirements = {
			credentials: [
				credential('src-stripe', 'Stripe API', 'httpHeaderAuth'),
				credential('src-slack', 'Slack', 'slackApi'),
				credential('src-header', 'Header Auth account', 'httpHeaderAuth'),
			],
		};

		expect(importWarnings(result, requirements)).toEqual([
			'The workflow now uses 2 credential(s) that this instance already had with the same name and type: Slack (slackApi, ID own-slack), Header Auth account (httpHeaderAuth, ID own-header). Make sure that they are the right ones before the workflow runs.',
		]);
	});

	it('leaves out a matched credential without a binding or without a requirement', () => {
		const result = outcome({
			credentials: { matched: ['src-slack', 'src-unknown'], stubbed: [] },
			bindings: { workflows: {}, credentials: { 'src-unknown': 'own-unknown' } },
		});

		expect(
			importWarnings(result, { credentials: [credential('src-slack', 'Slack', 'slackApi')] }),
		).toEqual([]);
	});

	it('gives the warnings in a fixed order', () => {
		expect(
			importWarnings(
				outcome({
					tags: { ...noTags, skipped: ['Finance'] },
					dataTables: { matched: 0, created: 3 },
					variables: { ...noVariables, missing: ['API_URL'] },
					credentials: { matched: ['src-slack'], stubbed: [] },
					bindings: { workflows: {}, credentials: { 'src-slack': 'own-slack' } },
				}),
				{
					credentials: [credential('src-slack', 'Slack', 'slackApi')],
					dataTables: [
						dataTable('dt-1', 'A'),
						dataTable('dt-2', 'B'),
						dataTable('dt-3', 'C'),
						dataTable('dt-4', 'D'),
					],
				},
			),
		).toEqual([
			'The import did not add 1 tag(s), because this instance does not have them: Finance.',
			'The import created 3 empty data table(s) for the workflow. The package holds no rows.',
			'1 of the 4 data table(s) that the workflow uses are not in the target project, and the import did not create them. The workflow uses: A, B, C, D. Create the missing tables, then select them in the workflow.',
			'The workflow uses 1 variable(s) that this instance does not have: API_URL. Create them before the workflow runs.',
			'The workflow now uses 1 credential(s) that this instance already had with the same name and type: Slack (slackApi, ID own-slack). Make sure that they are the right ones before the workflow runs.',
		]);
	});
});

describe('summariseImport', () => {
	it('reports a new workflow with its local id, name and publishing outcome', () => {
		const output = summariseImport({
			result: importResult(),
			sourceWorkflowId: 'wf-source',
			requirements: undefined,
			missingNodeTypes: [],
		});

		expect(output).toEqual({
			workflowId: 'wf-local',
			workflowName: 'Daily report',
			created: true,
			credentialsNeedingSetup: [],
			missingNodeTypes: [],
			warnings: [],
			publishing: { state: 'unchanged' },
			activeVersionId: null,
		});
	});

	it.each(['updated', 'skipped'] as const)('reports created: false for a %s workflow', (status) => {
		const output = summariseImport({
			result: importResult({ workflows: [importedWorkflow({ status })] }),
			sourceWorkflowId: 'wf-source',
			requirements: undefined,
			missingNodeTypes: [],
		});

		expect(output.created).toBe(false);
	});

	it('reports the workflow of the package, stubs, missing node types and the live version', () => {
		const publishing = { state: 'failed', error: 'Webhook path is taken' } as const;
		const output = summariseImport({
			result: importResult({
				workflows: [
					importedWorkflow({ sourceWorkflowId: 'other', localId: 'other-local', name: 'Other' }),
					importedWorkflow({ status: 'updated', activeVersionId: 'v-1', publishing }),
				],
				credentials: { matched: [], stubbed: ['src-stripe'] },
				bindings: { workflows: {}, credentials: { 'src-stripe': 'new-stripe' } },
				tags: { ...noTags, skipped: ['Finance'] },
			}),
			sourceWorkflowId: 'wf-source',
			requirements: {
				credentials: [credential('src-stripe', 'Stripe API', 'httpHeaderAuth')],
				dataTables: [{ id: 'dt-1', name: 'Leads', usedByWorkflows: ['wf-source'] }],
			},
			missingNodeTypes: [
				{ type: 'community.node', typeVersion: 2 },
				{ type: 'community.node', typeVersion: 2 },
				{ type: 'acme.node', typeVersion: 1 },
			],
		});

		expect(output).toEqual({
			workflowId: 'wf-local',
			workflowName: 'Daily report',
			created: false,
			credentialsNeedingSetup: [{ name: 'Stripe API', type: 'httpHeaderAuth', id: 'new-stripe' }],
			missingNodeTypes: ['acme.node@1', 'community.node@2'],
			warnings: [
				'The import did not add 1 tag(s), because this instance does not have them: Finance.',
				'1 of the 1 data table(s) that the workflow uses are not in the target project, and the import did not create them. The workflow uses: Leads. Create the missing tables, then select them in the workflow.',
			],
			publishing,
			activeVersionId: 'v-1',
		});
	});

	it('fails when the import result does not include the workflow of the package', () => {
		const summarise = () =>
			summariseImport({
				result: importResult(),
				sourceWorkflowId: 'wf-missing',
				requirements: undefined,
				missingNodeTypes: [],
			});

		expect(summarise).toThrow(UnexpectedError);
		expect(summarise).toThrow(
			expect.objectContaining({
				message: 'The import result does not include the workflow of the package',
				extra: { sourceWorkflowId: 'wf-missing' },
			}),
		);
	});
});
