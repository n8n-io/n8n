import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { User, WorkflowEntity } from '@n8n/db';

import { ErrorWorkflowValidationService } from '@/workflows/error-workflow-validation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

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
		settings: { availableInMCP: true },
		...overrides,
	});

const input = (overrides: Partial<PostImportInput> = {}): PostImportInput => ({
	user,
	summary: summary(),
	previous: undefined,
	workflowLabel: (id) => `"Alert the team" (${id})`,
	...overrides,
});

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

	it('keeps a link of a new copy that the user can use', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ settings: { errorWorkflow: 'wf-err' } }),
		);
		validation.findProblem.mockResolvedValue(undefined);

		const output = await finishImport(input());

		expect(validation.findProblem).toHaveBeenCalledWith({
			errorWorkflowId: 'wf-err',
			parentWorkflowId: 'wf-copy',
			user,
		});
		expect(workflowService.update).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([]);
	});

	it('removes a link of a new copy that the user cannot use, and says why', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ settings: { errorWorkflow: 'wf-err' } }),
		);
		validation.findProblem.mockResolvedValue({ reason: 'not-found' });

		const output = await finishImport(input());

		expect(savedSettings()).toEqual([{ errorWorkflow: 'DEFAULT' }]);
		expect(workflowService.update).toHaveBeenCalledWith(user, expect.anything(), 'wf-copy', {
			source: 'import',
			allowUnresolvedErrorWorkflow: true,
		});
		expect(output.warnings).toEqual([
			'The import removed the link to the error workflow "Alert the team" (wf-err), because it is not on this instance or you cannot open it. Choose an error workflow in the workflow settings.',
		]);
	});

	it('puts back the link that a re-imported copy had', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ settings: { errorWorkflow: 'wf-err' } }),
		);

		const output = await finishImport(
			input({
				summary: summary({ created: false }),
				previous: { activeVersionId: null, settings: { errorWorkflow: 'wf-own' } },
			}),
		);

		expect(savedSettings()).toEqual([{ errorWorkflow: 'wf-own' }]);
		expect(validation.findProblem).not.toHaveBeenCalled();
		expect(output.warnings).toEqual([]);
	});

	it('warns when the link cannot be checked, and still reports the import', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ settings: { errorWorkflow: 'wf-err' } }),
		);
		validation.findProblem.mockRejectedValue(new Error('Database is locked'));

		const output = await finishImport(input());

		expect(output.created).toBe(true);
		expect(output.warnings).toEqual([
			'The import could not check the error workflow of the copy: Database is locked. Check it in the workflow settings.',
		]);
		expect(logger.warn).toHaveBeenCalledWith('A step after a workflow package import failed', {
			workflowId: 'wf-copy',
			error: 'Database is locked',
		});
	});

	it('warns when the copy cannot be read, and takes the live version from the summary', async () => {
		finder.findWorkflowForUser.mockRejectedValue(new Error('Connection lost'));

		const output = await finishImport(
			input({ summary: summary({ activeVersionId: 'v-1', publishing: { state: 'published' } }) }),
		);

		expect(output.published).toBe(true);
		expect(output.warnings).toEqual([
			'The import could not check the error workflow of the copy: the workflow could not be read. Check it in the workflow settings.',
		]);
		expect(workflowService.update).not.toHaveBeenCalled();
	});

	it('says which version is live after a re-import of a published copy', async () => {
		finder.findWorkflowForUser.mockResolvedValue(
			storedCopy({ versionId: 'v-2', activeVersionId: 'v-2' }),
		);

		const output = await finishImport(
			input({
				summary: summary({ created: false, publishing: { state: 'published' } }),
				previous: { activeVersionId: 'v-1', settings: {} },
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
			.mockRejectedValueOnce(new Error('Service is not ready'));

		const first = await finishImport(
			input({ summary: summary({ warnings: ['First.'] }), afterImport }),
		);
		const second = await finishImport(input({ afterImport }));

		expect(afterImport).toHaveBeenCalledWith(user, 'wf-copy');
		expect(first.warnings).toEqual(['First.', 'Surface warning.']);
		expect(second.warnings).toEqual([
			'The workflow was imported, but a last step failed: Service is not ready',
		]);
	});
});
