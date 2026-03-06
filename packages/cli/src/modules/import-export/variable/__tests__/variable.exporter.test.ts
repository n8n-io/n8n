import type { Variables, VariablesRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ExportScope } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import { VariableExporter } from '../variable.exporter';

describe('VariableExporter', () => {
	let exporter: VariableExporter;
	let mockVariablesRepository: MockProxy<VariablesRepository>;
	let mockWriter: MockProxy<PackageWriter>;
	let scope: ExportScope;

	const basePath = 'projects/billing-550e84';

	beforeEach(() => {
		jest.clearAllMocks();

		mockVariablesRepository = mock<VariablesRepository>();
		mockWriter = mock<PackageWriter>();

		exporter = new VariableExporter(mockVariablesRepository);

		scope = {
			basePath,
			projectId: 'project-1',
			writer: mockWriter,
			entityOptions: {},
			state: { folderPathMap: new Map(), nodesByWorkflow: [] },
		};
	});

	it('should return empty array when project has no variables', async () => {
		mockVariablesRepository.find.mockResolvedValue([]);

		const entries = await exporter.export(scope);

		expect(entries).toEqual([]);
		expect(mockWriter.writeDirectory).not.toHaveBeenCalled();
		expect(mockWriter.writeFile).not.toHaveBeenCalled();
	});

	it('should export a variable', async () => {
		const variable = {
			id: 'var11100-0000-0000-0000-000000000000',
			key: 'API_BASE_URL',
			type: 'string',
			value: 'https://api.example.com',
		} as unknown as Variables;

		mockVariablesRepository.find.mockResolvedValue([variable]);

		const entries = await exporter.export(scope);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe(variable.id);
		expect(entries[0].name).toBe('API_BASE_URL');
		expect(entries[0].target).toBe('projects/billing-550e84/variables/apibaseurl-var111');

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith(
			'projects/billing-550e84/variables/apibaseurl-var111',
		);
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/variables/apibaseurl-var111/variable.json',
			expect.any(String),
		);
	});

	it('should export multiple variables', async () => {
		const variables = [
			{ id: 'aaa11100-0000-0000-0000-000000000000', key: 'VAR_A', type: 'string', value: 'a' },
			{ id: 'bbb22200-0000-0000-0000-000000000000', key: 'VAR_B', type: 'string', value: 'b' },
		] as unknown as Variables[];

		mockVariablesRepository.find.mockResolvedValue(variables);

		const entries = await exporter.export(scope);

		expect(entries).toHaveLength(2);
		expect(mockWriter.writeDirectory).toHaveBeenCalledTimes(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});

	it('should serialize variable data as JSON in the written file', async () => {
		const variable = {
			id: 'var11100-0000-0000-0000-000000000000',
			key: 'API_BASE_URL',
			type: 'string',
			value: 'https://api.example.com',
		} as unknown as Variables;

		const serialized = {
			id: variable.id,
			key: 'API_BASE_URL',
			type: 'string',
			value: 'https://api.example.com',
		};

		mockVariablesRepository.find.mockResolvedValue([variable]);

		await exporter.export(scope);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should query variables by project id', async () => {
		mockVariablesRepository.find.mockResolvedValue([]);

		await exporter.export(scope);

		expect(mockVariablesRepository.find).toHaveBeenCalledWith({
			where: { project: { id: 'project-1' } },
		});
	});
});
