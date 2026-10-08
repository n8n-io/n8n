import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { User, WorkflowEntity } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import type { INode } from 'n8n-workflow';

import { ErrorWorkflowValidationService } from '@/workflows/error-workflow-validation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { DataTableChoices } from '../copy-choices';
import type { ImportSummary } from '../import-summary';
import { finishImport, type PostImportInput } from '../workflow-package-post-import';

const user = Object.assign(new User(), { id: 'user-1' });

const summary = (overrides: Partial<ImportSummary> = {}): ImportSummary => ({
	workflowId: 'wf-copy',
	workflowName: 'Daily report',
	created: true,
	credentialsNeedingSetup: [],
	missingNodeTypes: [],
	warnings: [],
	publishing: { state: 'unchanged' },
	activeVersionId: null,
	...overrides,
});

const storedCopy = (overrides: Partial<WorkflowEntity> = {}) =>
	Object.assign(new WorkflowEntity(), {
		id: 'wf-copy',
		versionId: 'v-1',
		activeVersionId: null,
		nodes: [],
		settings: { availableInMCP: true },
		...overrides,
	});

const input = (overrides: Partial<PostImportInput> = {}): PostImportInput => ({
	user,
	summary: summary(),
	previous: undefined,
	packageWorkflow: { id: 'wf-source', errorWorkflow: undefined },
	workflowLabel: (id) => `"Alert the team" (${id})`,
	...overrides,
});

const INTERNAL = 'an internal error occurred. The server log has the details';

let finder: ReturnType<typeof mockInstance<WorkflowFinderService>>;
let workflowService: ReturnType<typeof mockInstance<WorkflowService>>;
let validation: ReturnType<typeof mockInstance<ErrorWorkflowValidationService>>;
let logger: ReturnType<typeof mockInstance<Logger>>;

beforeEach(() => {
	finder = mockInstance(WorkflowFinderService);
	workflowService = mockInstance(WorkflowService);
	validation = mockInstance(ErrorWorkflowValidationService);
	logger = mockInstance(Logger);
	finder.findWorkflowForUser.mockResolvedValue(storedCopy());
});

const savedSettings = () => workflowService.update.mock.calls.map(([, entity]) => entity.settings);

const withLink = (errorWorkflow = 'wf-err') =>
	finder.findWorkflowForUser.mockResolvedValue(storedCopy({ settings: { errorWorkflow } }));

describe('finishImport', () => {
	it('reports the copy as it is stored, without the internal publishing fields', async () => {
		finder.findWorkflowForUser.mockResolvedValue(storedCopy({ activeVersionId: 'v-1' }));

		const output = await finishImport(input({ summary: summary({ warnings: ['First.'] }) }));

		expect(output).toEqual({
			workflowId: 'wf-copy',
			workflowName: 'Daily report',
			created: true,
			published: true,
			credentialsNeedingSetup: [],
			missingNodeTypes: [],
			warnings: ['First.'],
		});
		expect(finder.findWorkflowForUser).toHaveBeenCalledWith('wf-copy', user, ['workflow:read']);
		expect(workflowService.update).not.toHaveBeenCalled();
	});

	it('says which version is live after a re-import of a published copy', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ versionId: 'v-2', activeVersionId: 'v-2' }),
		);

		const output = await finishImport(
			input({
				summary: summary({ created: false, publishing: { state: 'published' } }),
				previous: { activeVersionId: 'v-1', settings: {}, nodes: [] },
			}),
		);

		expect(output.warnings).toEqual([
			'The workflow was published, so the import published the new version. The new version is live now.',
		]);
	});

	it('adds the warnings of the surface last, and turns its error into a warning', async () => {
		const afterImport = vi
			.fn()
			.mockResolvedValueOnce(['Surface warning.'])
			.mockRejectedValueOnce(new ForbiddenError('You cannot change this workflow.'))
			.mockRejectedValueOnce(new Error('relation "workflow_entity" does not exist'));

		const first = await finishImport(
			input({ summary: summary({ warnings: ['First.'] }), afterImport }),
		);
		const second = await finishImport(input({ afterImport }));
		const third = await finishImport(input({ afterImport }));

		expect(afterImport).toHaveBeenCalledWith(user, 'wf-copy');
		expect(first.warnings).toEqual(['First.', 'Surface warning.']);
		expect(second.warnings).toEqual([
			'The workflow was imported, but a last step failed: You cannot change this workflow',
		]);
		expect(third.warnings).toEqual([
			`The workflow was imported, but a last step failed: ${INTERNAL}`,
		]);
		expect(logger.warn).toHaveBeenCalledWith('A step after a workflow package import failed', {
			workflowId: 'wf-copy',
			error: 'relation "workflow_entity" does not exist',
		});
	});
});

describe('finishImport and the error workflow link', () => {
	it('keeps a link of a new copy that the user and the surface can use', async () => {
		withLink();
		validation.findProblem.mockResolvedValue(undefined);
		const errorWorkflowRule = vi.fn().mockResolvedValue(undefined);

		const output = await finishImport(input({ errorWorkflowRule }));

		expect(validation.findProblem).toHaveBeenCalledWith({
			errorWorkflowId: 'wf-err',
			parentWorkflowId: 'wf-copy',
			user,
		});
		expect(errorWorkflowRule).toHaveBeenCalledWith(user, 'wf-err');
		expect(workflowService.update).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([]);
	});

	it('removes a link of a new copy that the user cannot use, and says why', async () => {
		withLink();
		validation.findProblem.mockResolvedValue({ reason: 'not-found' });
		const errorWorkflowRule = vi.fn();

		const output = await finishImport(input({ errorWorkflowRule }));

		expect(savedSettings()).toEqual([{ errorWorkflow: 'DEFAULT' }]);
		expect(workflowService.update).toHaveBeenCalledWith(user, expect.anything(), 'wf-copy', {
			source: 'import',
			allowUnresolvedErrorWorkflow: true,
		});
		expect(errorWorkflowRule).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([
			'The import removed the link to the error workflow "Alert the team" (wf-err), because it is not on this instance or you cannot open it. Choose an error workflow in the workflow settings.',
		]);
	});

	it('removes a link that the rule of the surface refuses, and says why', async () => {
		withLink();
		validation.findProblem.mockResolvedValue(undefined);

		const output = await finishImport(
			input({ errorWorkflowRule: vi.fn().mockResolvedValue('it is not available in MCP') }),
		);

		expect(savedSettings()).toEqual([{ errorWorkflow: 'DEFAULT' }]);
		expect(output.warnings).toEqual([
			'The import removed the link to the error workflow "Alert the team" (wf-err), because it is not available in MCP. Choose an error workflow in the workflow settings.',
		]);
	});

	it('puts back the link that a re-imported copy had', async () => {
		withLink();

		const output = await finishImport(
			input({
				summary: summary({ created: false }),
				previous: { activeVersionId: null, settings: { errorWorkflow: 'wf-own' }, nodes: [] },
			}),
		);

		expect(savedSettings()).toEqual([{ errorWorkflow: 'wf-own' }]);
		expect(validation.findProblem).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([]);
	});

	it('removes a link that it cannot check, and still reports the import', async () => {
		withLink();
		validation.findProblem.mockRejectedValue(new Error('SQLITE_BUSY: database is locked'));

		const output = await finishImport(input());

		expect(output.created).toBe(true);
		expect(savedSettings()).toEqual([{ errorWorkflow: 'DEFAULT' }]);
		expect(output.warnings).toEqual([
			`The import removed the error workflow link of the copy, because it could not check the link: ${INTERNAL}. Choose an error workflow in the workflow settings.`,
		]);
		expect(logger.warn).toHaveBeenCalledWith('A step after a workflow package import failed', {
			workflowId: 'wf-copy',
			error: 'SQLITE_BUSY: database is locked',
		});
	});

	it('removes the link when the rule of the surface fails', async () => {
		withLink();
		validation.findProblem.mockResolvedValue(undefined);

		const output = await finishImport(
			input({ errorWorkflowRule: vi.fn().mockRejectedValue(new Error('Connection lost')) }),
		);

		expect(savedSettings()).toEqual([{ errorWorkflow: 'DEFAULT' }]);
		expect(output.warnings).toEqual([
			`The import removed the error workflow link of the copy, because it could not check the link: ${INTERNAL}. Choose an error workflow in the workflow settings.`,
		]);
	});

	it('removes the link of the package when it cannot put back the link of the copy', async () => {
		withLink();
		workflowService.update
			.mockRejectedValueOnce(new ForbiddenError('You cannot update this workflow.'))
			.mockResolvedValueOnce(storedCopy());

		const output = await finishImport(
			input({
				summary: summary({ created: false }),
				previous: { activeVersionId: null, settings: { errorWorkflow: 'wf-own' }, nodes: [] },
			}),
		);

		expect(savedSettings()).toEqual([{ errorWorkflow: 'wf-own' }, { errorWorkflow: 'DEFAULT' }]);
		expect(output.warnings).toEqual([
			'The import removed the error workflow link of the copy, because it could not check the link: You cannot update this workflow. Choose an error workflow in the workflow settings.',
		]);
	});

	it('says that a link stays unchecked when it can neither check nor remove it', async () => {
		withLink();
		validation.findProblem.mockResolvedValue({ reason: 'caller-policy' });
		workflowService.update.mockRejectedValue(new ForbiddenError('You cannot update it.'));

		const output = await finishImport(input());

		expect(workflowService.update).toHaveBeenCalledTimes(2);
		expect(output.warnings).toEqual([
			'The import could not check the error workflow of the copy: You cannot update it. Check it in the workflow settings.',
		]);
	});

	it('checks the link of the package when the copy cannot be read', async () => {
		finder.findWorkflowForUser.mockRejectedValue(new Error('Connection lost'));
		validation.findProblem.mockResolvedValue({ reason: 'not-published' });

		const output = await finishImport(
			input({
				summary: summary({ activeVersionId: 'v-1', publishing: { state: 'published' } }),
				packageWorkflow: { id: 'wf-source', errorWorkflow: 'wf-err' },
			}),
		);

		expect(output.published).toBe(true);
		expect(savedSettings()).toEqual([{ errorWorkflow: 'DEFAULT' }]);
		expect(output.warnings).toEqual([
			'The import removed the link to the error workflow "Alert the team" (wf-err), because it is not published. Choose an error workflow in the workflow settings.',
		]);
	});

	it('keeps a link of the package to its own workflow when the copy cannot be read', async () => {
		finder.findWorkflowForUser.mockRejectedValue(new Error('Connection lost'));

		const output = await finishImport(
			input({ packageWorkflow: { id: 'wf-source', errorWorkflow: 'wf-source' } }),
		);

		expect(validation.findProblem).not.toHaveBeenCalled();
		expect(workflowService.update).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([]);
	});
});

describe('finishImport and the data tables that a re-import keeps', () => {
	const tableNode = (value: string): INode => ({
		id: 'dt-node',
		name: 'Data table',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1,
		position: [0, 0],
		parameters: { dataTableId: { __rl: true, mode: 'list', value } },
	});

	const ownTable = { __rl: true, mode: 'list', value: 'dt-own' };

	const choices: DataTableChoices = {
		selections: new Map([['dt-node', ownTable]]),
		replacedTables: [{ id: 'dt-source', name: 'Customers' }],
	};

	const reimport = (overrides: Partial<PostImportInput> = {}) =>
		input({
			summary: summary({ created: false, publishing: { state: 'published' } }),
			previous: { activeVersionId: 'v-1', settings: {}, nodes: [] },
			dataTables: choices,
			...overrides,
		});

	const savedNodes = () => workflowService.update.mock.calls.map(([, entity]) => entity.nodes);

	it('puts the tables of the copy back and publishes them when the import put its version live', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ versionId: 'v-2', activeVersionId: 'v-2', nodes: [tableNode('dt-source')] }),
		);
		workflowService.update.mockResolvedValue(
			storedCopy({ versionId: 'v-3', activeVersionId: 'v-3', nodes: [tableNode('dt-own')] }),
		);

		const output = await finishImport(reimport());

		expect(savedNodes()).toEqual([[tableNode('dt-own')]]);
		expect(workflowService.update).toHaveBeenCalledWith(user, expect.anything(), 'wf-copy', {
			source: 'import',
			publishIfActive: true,
		});
		expect(output.published).toBe(true);
		expect(output.warnings).toEqual([
			'The copy keeps the data tables that it used in place of 1 data table(s) of the package that this project does not have: Customers.',
			'The workflow was published, so the import published the new version. The new version is live now.',
		]);
	});

	it('does not publish the tables when an earlier version stays live', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ versionId: 'v-2', activeVersionId: 'v-1', nodes: [tableNode('dt-source')] }),
		);
		workflowService.update.mockResolvedValue(storedCopy({ versionId: 'v-3', activeVersionId: 'v-1' }));

		await finishImport(reimport({ summary: summary({ created: false }) }));

		expect(workflowService.update).toHaveBeenCalledWith(user, expect.anything(), 'wf-copy', {
			source: 'import',
			publishIfActive: false,
		});
	});

	it('does not publish a copy that is not published', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ versionId: 'v-2', activeVersionId: null, nodes: [tableNode('dt-source')] }),
		);
		workflowService.update.mockResolvedValue(storedCopy({ versionId: 'v-3' }));

		const output = await finishImport(reimport({ summary: summary({ created: false }) }));

		expect(workflowService.update.mock.calls[0][3]).toEqual({
			source: 'import',
			publishIfActive: false,
		});
		expect(output.published).toBe(false);
	});

	it('writes nothing when the nodes already use the tables of the copy', async () => {
		finder.findWorkflowForUser.mockResolvedValue(storedCopy({ nodes: [tableNode('dt-own')] }));

		const output = await finishImport(reimport());

		expect(workflowService.update).not.toHaveBeenCalled();
		expect(output.warnings[0]).toContain('The copy keeps the data tables that it used');
	});

	it('says which tables it could not keep, and reports the live version that the import left', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ versionId: 'v-2', activeVersionId: 'v-2', nodes: [tableNode('dt-source')] }),
		);
		workflowService.update.mockRejectedValue(new Error('Lock wait timeout'));

		const output = await finishImport(reimport());

		expect(output.published).toBe(true);
		expect(output.warnings[0]).toBe(
			`The import could not keep the data tables that the copy used in place of 1 data table(s) of the package that this project does not have (Customers), because ${INTERNAL}. Check the data tables in the workflow before it runs.`,
		);
	});

	it('says that it could not keep the tables when the copy cannot be read', async () => {
		finder.findWorkflowForUser.mockRejectedValue(new Error('Connection lost'));

		const output = await finishImport(reimport());

		expect(workflowService.update).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([
			'The import could not keep the data tables that the copy used in place of 1 data table(s) of the package that this project does not have (Customers), because the workflow could not be read. Check the data tables in the workflow before it runs.',
		]);
	});

	it('does nothing for a copy whose data tables the import resolved', async () => {
		finder.findWorkflowForUser.mockResolvedValue(storedCopy({ nodes: [tableNode('dt-source')] }));

		const output = await finishImport(
			reimport({ dataTables: { selections: new Map(), replacedTables: [] } }),
		);

		expect(workflowService.update).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([]);
	});
});
