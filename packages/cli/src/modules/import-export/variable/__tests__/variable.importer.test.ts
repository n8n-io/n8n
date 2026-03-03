import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';

import type { ProjectImportContext } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { VariableImporter } from '../variable.importer';
import type { ManifestVariableEntry } from '../variable.types';

describe('VariableImporter', () => {
	let importer: VariableImporter;
	let mockVariablesService: MockProxy<VariablesService>;
	let mockReader: MockProxy<PackageReader>;
	let ctx: ProjectImportContext;

	beforeEach(() => {
		jest.clearAllMocks();

		mockVariablesService = mock<VariablesService>();
		mockReader = mock<PackageReader>();

		importer = new VariableImporter(mockVariablesService);

		ctx = {
			user: mock(),
			projectId: 'new-project-1',
			projectEntry: mock(),
			folderIdMap: new Map(),
			reader: mockReader,
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.importForProject(ctx, []);

		expect(mockVariablesService.create).not.toHaveBeenCalled();
	});

	it('should create a variable via VariablesService', async () => {
		const entries: ManifestVariableEntry[] = [
			{ id: 'var-1', name: 'API_URL', target: 'projects/billing/variables/api-url' },
		];

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'var-1', key: 'API_URL', value: 'https://example.com', type: 'string' }),
		);
		mockVariablesService.create.mockResolvedValue(mock());

		await importer.importForProject(ctx, entries);

		expect(mockVariablesService.create).toHaveBeenCalledWith(ctx.user, {
			key: 'API_URL',
			value: 'https://example.com',
			type: 'string',
			projectId: 'new-project-1',
		});
	});

	it('should create multiple variables', async () => {
		const entries: ManifestVariableEntry[] = [
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
		mockVariablesService.create.mockResolvedValue(mock());

		await importer.importForProject(ctx, entries);

		expect(mockVariablesService.create).toHaveBeenCalledTimes(2);
	});
});
