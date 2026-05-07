import type { User } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { CredentialImporter } from '../../entities/credential/credential.finalize';
import type { DataTableImporter } from '../../entities/data-table/data-table.importer';
import type { FolderImporter } from '../../entities/folder/folder.importer';
import type { ImportScope } from '../../import-export.types';
import type { PackageReader } from '../../io/package-reader';
import type { TagImporter } from '../../entities/tag/tag.importer';
import type { VariableImporter } from '../../entities/variable/variable.importer';
import type { WorkflowImporter } from '../../entities/workflow/workflow.importer';
import { ImportPipeline } from '../import.pipeline';

describe('ImportPipeline', () => {
	let pipeline: ImportPipeline;
	let mockFolderImporter: MockProxy<FolderImporter>;
	let mockWorkflowImporter: MockProxy<WorkflowImporter>;
	let mockTagImporter: MockProxy<TagImporter>;
	let mockVariableImporter: MockProxy<VariableImporter>;
	let mockDataTableImporter: MockProxy<DataTableImporter>;
	let mockCredentialImporter: MockProxy<CredentialImporter>;
	let mockUser: MockProxy<User>;
	let mockReader: { readFile: jest.Mock; hasFile: jest.Mock };

	beforeEach(() => {
		jest.clearAllMocks();

		mockFolderImporter = mock<FolderImporter>({ entityKey: 'folders' });
		mockWorkflowImporter = mock<WorkflowImporter>({ entityKey: 'workflows' });
		mockTagImporter = mock<TagImporter>({ entityKey: 'tags' });
		mockVariableImporter = mock<VariableImporter>({ entityKey: 'variables' });
		mockDataTableImporter = mock<DataTableImporter>({ entityKey: 'dataTables' });
		mockCredentialImporter = mock<CredentialImporter>();
		mockUser = mock<User>();

		mockReader = {
			readFile: jest.fn(),
			hasFile: jest.fn().mockReturnValue(false),
		};

		// Folder importer returns empty folderIdMap by default
		mockFolderImporter.import.mockResolvedValue({ folderIdMap: new Map() });

		// Tag importer returns empty mapping by default
		mockTagImporter.import.mockResolvedValue({ tagsBySourceId: new Map() });

		// Credential finalize defaults to returning the bindings unchanged
		mockCredentialImporter.finalize.mockImplementation(async (_scope, opts) => opts.bindings);

		pipeline = new ImportPipeline(
			mockFolderImporter,
			mockWorkflowImporter,
			mockTagImporter,
			mockVariableImporter,
			mockDataTableImporter,
			mockCredentialImporter,
		);
	});

	function makeScope(overrides?: Partial<ImportScope>): ImportScope {
		return {
			user: mockUser,
			targetProjectId: 'proj-1',
			reader: mockReader as unknown as PackageReader,
			entityOptions: {},
			...overrides,
		};
	}

	describe('importEntities', () => {
		it('should import folders sequentially, then workflows/variables/data-tables in parallel', async () => {
			const scope = makeScope();

			const entries = {
				folders: [{ id: 'f-1', name: 'invoices', target: './folders/invoices' }],
				workflows: [{ id: 'wf-1', name: 'sync', target: './workflows/sync' }],
				variables: [{ id: 'v-1', name: 'API_KEY', target: './variables/api-key' }],
				dataTables: [{ id: 'dt-1', name: 'lookup', target: './data-tables/lookup' }],
			};

			await pipeline.importEntities(scope, entries);

			expect(mockFolderImporter.import).toHaveBeenCalledWith(scope, entries.folders);
			expect(mockWorkflowImporter.import).toHaveBeenCalledWith(
				scope,
				entries.workflows,
				expect.objectContaining({
					folderIdMap: expect.any(Map),
					credentialBindings: expect.any(Map),
					subWorkflowBindings: expect.any(Map),
				}),
			);
			expect(mockVariableImporter.import).toHaveBeenCalledWith(scope, entries.variables);
			expect(mockDataTableImporter.import).toHaveBeenCalledWith(scope, entries.dataTables);
		});

		it('should handle missing entity arrays gracefully', async () => {
			const scope = makeScope();

			await pipeline.importEntities(scope, {});

			expect(mockFolderImporter.import).toHaveBeenCalledWith(scope, []);
			expect(mockWorkflowImporter.import).toHaveBeenCalledWith(scope, [], expect.any(Object));
		});

		it('should call credentialImporter.finalize with createStubs=true when enabled', async () => {
			const scope = makeScope();

			const unresolvedCreds = [
				{ id: 'c-1', name: 'Slack', type: 'slackApi', usedByWorkflows: [] as string[] },
			];
			mockCredentialImporter.finalize.mockResolvedValue(new Map([['c-1', 'stub-1']]));

			await pipeline.importEntities(
				scope,
				{},
				{
					createCredentialStubs: true,
					unresolvedCredentialRequirements: unresolvedCreds,
				},
			);

			expect(mockCredentialImporter.finalize).toHaveBeenCalledWith(
				scope,
				expect.objectContaining({
					createStubs: true,
					unresolvedRequirements: unresolvedCreds,
					bindings: expect.any(Map),
				}),
			);
		});

		it('should still call credentialImporter.finalize when stubs disabled (for sharing)', async () => {
			const scope = makeScope();

			await pipeline.importEntities(scope, {}, { createCredentialStubs: false });

			// finalize is the central place that ensures credential bindings
			// are shared with the target project, so it always runs.
			expect(mockCredentialImporter.finalize).toHaveBeenCalledWith(
				scope,
				expect.objectContaining({ createStubs: false }),
			);
		});

		it('should pass updated credentialBindings to workflow importer after finalize', async () => {
			const scope = makeScope();

			const unresolvedCreds = [
				{ id: 'c-1', name: 'Slack', type: 'slackApi', usedByWorkflows: [] as string[] },
			];
			const updatedBindings = new Map([['c-1', 'stub-1']]);
			mockCredentialImporter.finalize.mockResolvedValue(updatedBindings);

			await pipeline.importEntities(
				scope,
				{},
				{
					createCredentialStubs: true,
					unresolvedCredentialRequirements: unresolvedCreds,
				},
			);

			expect(mockWorkflowImporter.import).toHaveBeenCalledWith(
				scope,
				[],
				expect.objectContaining({
					credentialBindings: updatedBindings,
				}),
			);
		});

		it('should seed bindings from the optional seed argument', async () => {
			const scope = makeScope();
			const credSeed = new Map([['source-c', 'target-c']]);
			const wfSeed = new Map([['source-wf', 'target-wf']]);

			await pipeline.importEntities(scope, {}, undefined, {
				credentialBindings: credSeed,
				subWorkflowBindings: wfSeed,
			});

			expect(mockWorkflowImporter.import).toHaveBeenCalledWith(
				scope,
				[],
				expect.objectContaining({
					credentialBindings: expect.any(Map),
					subWorkflowBindings: expect.any(Map),
				}),
			);

			const passedDeps = mockWorkflowImporter.import.mock.calls[0][2];
			expect(passedDeps?.credentialBindings.get('source-c')).toBe('target-c');
			expect(passedDeps?.subWorkflowBindings.get('source-wf')).toBe('target-wf');
		});

		it('should pass folderIdMap from FolderImporter to WorkflowImporter', async () => {
			const scope = makeScope();
			const folderIdMap = new Map([['source-f', 'target-f']]);
			mockFolderImporter.import.mockResolvedValue({ folderIdMap });

			await pipeline.importEntities(scope, {});

			const passedDeps = mockWorkflowImporter.import.mock.calls[0][2];
			expect(passedDeps?.folderIdMap.get('source-f')).toBe('target-f');
		});
	});
});
