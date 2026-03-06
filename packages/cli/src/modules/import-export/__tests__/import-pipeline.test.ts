import type { User } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { CredentialImporter } from '../credential/credential.importer';
import type { DataTableImporter } from '../data-table/data-table.importer';
import type { FolderImporter } from '../folder/folder.importer';
import { ImportPipeline } from '../import-pipeline';
import type { ImportScope } from '../import-export.types';
import type { PackageReader } from '../package-reader';
import type { VariableImporter } from '../variable/variable.importer';
import type { WorkflowImporter } from '../workflow/workflow.importer';

describe('ImportPipeline', () => {
	let pipeline: ImportPipeline;
	let mockFolderImporter: MockProxy<FolderImporter>;
	let mockWorkflowImporter: MockProxy<WorkflowImporter>;
	let mockVariableImporter: MockProxy<VariableImporter>;
	let mockDataTableImporter: MockProxy<DataTableImporter>;
	let mockCredentialImporter: MockProxy<CredentialImporter>;
	let mockUser: MockProxy<User>;
	let mockReader: { readFile: jest.Mock; hasFile: jest.Mock };

	beforeEach(() => {
		jest.clearAllMocks();

		mockFolderImporter = mock<FolderImporter>({ entityKey: 'folders' });
		mockWorkflowImporter = mock<WorkflowImporter>({ entityKey: 'workflows' });
		mockVariableImporter = mock<VariableImporter>({ entityKey: 'variables' });
		mockDataTableImporter = mock<DataTableImporter>({ entityKey: 'dataTables' });
		mockCredentialImporter = mock<CredentialImporter>();
		mockUser = mock<User>();

		mockReader = {
			readFile: jest.fn(),
			hasFile: jest.fn().mockReturnValue(false),
		};

		pipeline = new ImportPipeline(
			mockFolderImporter,
			mockWorkflowImporter,
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
			state: ImportPipeline.createPipelineState(),
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
			expect(mockWorkflowImporter.import).toHaveBeenCalledWith(scope, entries.workflows);
			expect(mockVariableImporter.import).toHaveBeenCalledWith(scope, entries.variables);
			expect(mockDataTableImporter.import).toHaveBeenCalledWith(scope, entries.dataTables);
		});

		it('should handle missing entity arrays gracefully', async () => {
			const scope = makeScope();

			await pipeline.importEntities(scope, {});

			expect(mockFolderImporter.import).toHaveBeenCalledWith(scope, []);
			expect(mockWorkflowImporter.import).toHaveBeenCalledWith(scope, []);
		});

		it('should create credential stubs when enabled', async () => {
			const scope = makeScope();

			const unresolvedCreds = [
				{ id: 'c-1', name: 'Slack', type: 'slackApi', usedByWorkflows: [] as string[] },
			];
			mockCredentialImporter.createStubsFromRequirements.mockResolvedValue(
				new Map([['c-1', 'stub-1']]),
			);

			await pipeline.importEntities(
				scope,
				{},
				{
					createCredentialStubs: true,
					unresolvedCredentialRequirements: unresolvedCreds,
				},
			);

			expect(mockCredentialImporter.createStubsFromRequirements).toHaveBeenCalledWith(
				scope,
				unresolvedCreds,
				expect.any(Map),
			);
		});

		it('should not create credential stubs when disabled', async () => {
			const scope = makeScope();

			await pipeline.importEntities(
				scope,
				{},
				{
					createCredentialStubs: false,
				},
			);

			expect(mockCredentialImporter.createStubsFromRequirements).not.toHaveBeenCalled();
		});

		it('should update credentialBindings on scope.state after creating stubs', async () => {
			const scope = makeScope();

			const unresolvedCreds = [
				{ id: 'c-1', name: 'Slack', type: 'slackApi', usedByWorkflows: [] as string[] },
			];
			const updatedBindings = new Map([['c-1', 'stub-1']]);
			mockCredentialImporter.createStubsFromRequirements.mockResolvedValue(updatedBindings);

			await pipeline.importEntities(
				scope,
				{},
				{
					createCredentialStubs: true,
					unresolvedCredentialRequirements: unresolvedCreds,
				},
			);

			// The workflow importer should see the updated bindings via scope.state
			expect(mockWorkflowImporter.import).toHaveBeenCalledWith(
				expect.objectContaining({
					state: expect.objectContaining({
						credentialBindings: updatedBindings,
					}),
				}),
				[],
			);
		});
	});

	describe('createPipelineState', () => {
		it('should create empty state by default', () => {
			const state = ImportPipeline.createPipelineState();

			expect(state.folderIdMap.size).toBe(0);
			expect(state.credentialBindings.size).toBe(0);
			expect(state.subWorkflowBindings.size).toBe(0);
		});

		it('should initialize with provided bindings', () => {
			const credBindings = new Map([['c-1', 'target-c']]);
			const wfBindings = new Map([['wf-1', 'target-wf']]);

			const state = ImportPipeline.createPipelineState(credBindings, wfBindings);

			expect(state.credentialBindings).toEqual(credBindings);
			expect(state.subWorkflowBindings).toEqual(wfBindings);
			expect(state.folderIdMap.size).toBe(0);
		});
	});
});
