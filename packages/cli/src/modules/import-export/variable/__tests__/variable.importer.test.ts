import type { VariablesRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ImportScope } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { VariableImporter } from '../variable.importer';
import type { ManifestEntry } from '../../import-export.types';

describe('VariableImporter', () => {
	let importer: VariableImporter;
	let mockVariablesRepository: MockProxy<VariablesRepository>;
	let mockReader: MockProxy<PackageReader>;
	let scope: ImportScope;

	beforeEach(() => {
		jest.clearAllMocks();

		mockVariablesRepository = mock<VariablesRepository>();
		mockReader = mock<PackageReader>();

		importer = new VariableImporter(mockVariablesRepository);

		scope = {
			user: mock(),
			targetProjectId: 'new-project-1',
			reader: mockReader,
			entityOptions: {},
			state: {
				folderIdMap: new Map(),
				credentialBindings: new Map(),
				subWorkflowBindings: new Map(),
			},
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.import(scope, []);

		expect(mockVariablesRepository.save).not.toHaveBeenCalled();
	});

	it('should create a variable when no existing match', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'var-1', name: 'API_URL', target: 'projects/billing/variables/api-url' },
		];

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'var-1', key: 'API_URL', value: 'https://example.com', type: 'string' }),
		);
		mockVariablesRepository.findOne.mockResolvedValue(null);

		await importer.import(scope, entries);

		expect(mockVariablesRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'API_URL',
				value: 'https://example.com',
				type: 'string',
				project: { id: 'new-project-1' },
			}),
		);
	});

	it('should skip an existing variable with the same key', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'var-1', name: 'API_URL', target: 'projects/billing/variables/api-url' },
		];

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'var-1', key: 'API_URL', value: 'https://new.com', type: 'string' }),
		);
		mockVariablesRepository.findOne.mockResolvedValue({
			id: 'existing-var',
			key: 'API_URL',
			value: 'https://old.com',
		} as never);

		await importer.import(scope, entries);

		expect(mockVariablesRepository.save).not.toHaveBeenCalled();
	});

	it('should create multiple variables', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'var-1', name: 'API_URL', target: 'projects/billing/variables/api-url' },
			{ id: 'var-2', name: 'API_KEY', target: 'projects/billing/variables/api-key' },
		];

		mockReader.readFile
			.mockReturnValueOnce(
				JSON.stringify({
					id: 'var-1',
					key: 'API_URL',
					value: 'https://example.com',
					type: 'string',
				}),
			)
			.mockReturnValueOnce(
				JSON.stringify({ id: 'var-2', key: 'API_KEY', value: 'secret', type: 'string' }),
			);
		mockVariablesRepository.findOne.mockResolvedValue(null);

		await importer.import(scope, entries);

		expect(mockVariablesRepository.save).toHaveBeenCalledTimes(2);
	});
});
