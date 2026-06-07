import { Readable } from 'node:stream';

import { mock } from 'jest-mock-extended';

import { AgentKnowledgeCsvService } from '../agent-knowledge-csv.service';
import type { AgentKnowledgeService, KnowledgeWorkspaceFile } from '../agent-knowledge.service';

function makeFile(overrides: Partial<KnowledgeWorkspaceFile> = {}): KnowledgeWorkspaceFile {
	return {
		id: 'file-1',
		fileName: 'data.csv',
		mimeType: 'text/csv',
		fileSizeBytes: 24,
		relativePath: 'file-1.csv',
		...overrides,
	};
}

function makeService(content: string, file = makeFile()) {
	return makeServiceWithStream(Readable.from([content]), file);
}

function makeServiceWithStream(contentStream: Readable, file = makeFile()) {
	const knowledgeService = mock<AgentKnowledgeService>();
	knowledgeService.openWorkspaceFileStream.mockResolvedValue({
		file,
		contentStream,
	});

	return {
		service: new AgentKnowledgeCsvService(knowledgeService),
		knowledgeService,
	};
}

describe('AgentKnowledgeCsvService', () => {
	it('queries CSV rows from the stored file stream', async () => {
		const { service, knowledgeService } = makeService(
			['country,year,population', 'Germany,2022,84086227', 'France,2022,66277412'].join('\n'),
		);

		await expect(
			service.queryCsv('agent-1', 'project-1', {
				operation: 'csv_query',
				file: 'file-1',
				where: [{ column: 'country', op: 'eq', value: 'Germany' }],
				select: ['country', 'year', 'population'],
				limit: 20,
			}),
		).resolves.toMatchObject({
			fileName: 'data.csv',
			columns: ['country', 'year', 'population'],
			rows: [['Germany', '2022', '84086227']],
			rowNumbers: [2],
			rowCount: 1,
			truncated: false,
		});
		expect(knowledgeService.openWorkspaceFileStream).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			'file-1',
		);
	});

	it('profiles CSV columns with inferred types', async () => {
		const { service } = makeService(
			['Year,Mean,Reviewed', '1880,-0.12,true', '1881,-0.09,false'].join('\n'),
			makeFile({ fileName: 'temperature.csv' }),
		);

		await expect(
			service.profileCsv('agent-1', 'project-1', {
				operation: 'csv_profile',
				file: 'file-1',
				sampleSize: 2,
				distinctLimit: 100,
			}),
		).resolves.toMatchObject({
			fileName: 'temperature.csv',
			columns: ['Year', 'Mean', 'Reviewed'],
			rowCount: 2,
			columnProfiles: expect.arrayContaining([
				expect.objectContaining({ name: 'Year', inferredType: 'integer' }),
				expect.objectContaining({ name: 'Mean', inferredType: 'number' }),
				expect.objectContaining({ name: 'Reviewed', inferredType: 'boolean' }),
			]),
		});
	});

	it('returns column validation errors without leaking storage details', async () => {
		const { service } = makeService('country,year\nGermany,2022\n');

		await expect(
			service.queryCsv('agent-1', 'project-1', {
				operation: 'csv_query',
				file: 'file-1',
				select: ['missing-column'],
				limit: 20,
			}),
		).rejects.toThrow('CSV column "missing-column" not found in "data.csv"');
	});

	it('rejects non-CSV files before parsing', async () => {
		const stream = Readable.from(['plain text']);
		const destroySpy = jest.spyOn(stream, 'destroy');
		const { service } = makeServiceWithStream(
			stream,
			makeFile({
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				relativePath: 'file-1.txt',
			}),
		);

		await expect(
			service.queryCsv('agent-1', 'project-1', {
				operation: 'csv_query',
				file: 'file-1',
				select: ['country'],
				limit: 20,
			}),
		).rejects.toThrow('File "notes.txt" is not queryable as CSV.');
		expect(destroySpy).toHaveBeenCalledTimes(1);
	});

	it('closes the stored file stream when csv_query validation fails before parsing', async () => {
		const stream = Readable.from(['country,year\nGermany,2022\n']);
		const destroySpy = jest.spyOn(stream, 'destroy');
		const { service } = makeServiceWithStream(stream);

		await expect(
			service.queryCsv('agent-1', 'project-1', {
				operation: 'csv_query',
				file: 'file-1',
				limit: 20,
			}),
		).rejects.toThrow('csv_query requires select unless rowNumber is provided.');
		expect(destroySpy).toHaveBeenCalledTimes(1);
	});

	it('rejects CSV parsing when it exceeds the operation timeout', async () => {
		jest.useFakeTimers();
		const stream = new Readable({
			read() {
				// Never push data so parsing waits until timeout.
			},
		});
		const destroySpy = jest.spyOn(stream, 'destroy');
		const { service } = makeServiceWithStream(stream);

		const promise = service.queryCsv('agent-1', 'project-1', {
			operation: 'csv_query',
			file: 'file-1',
			select: ['country'],
			limit: 20,
		});
		const assertion = expect(promise).rejects.toThrow('CSV operation timed out after 15000ms');

		await jest.advanceTimersByTimeAsync(15_000);
		await assertion;
		expect(destroySpy).toHaveBeenCalled();
		jest.useRealTimers();
	});

	it('returns distinct values with truncation metadata', async () => {
		const { service } = makeService(
			['country,year', 'Germany,2022', 'France,2022', 'Spain,2022', 'Italy,2022'].join('\n'),
		);

		await expect(
			service.distinctCsv('agent-1', 'project-1', {
				operation: 'csv_distinct',
				file: 'file-1',
				column: 'country',
				where: [{ column: 'year', op: 'eq', value: '2022' }],
				limit: 2,
			}),
		).resolves.toMatchObject({
			fileName: 'data.csv',
			column: 'country',
			values: ['Germany', 'France'],
			distinctCount: 4,
			truncated: true,
		});
	});

	it('aggregates grouped metrics and reports skipped non-numeric values', async () => {
		const { service } = makeService(
			[
				'country,population,notes',
				'Germany,84086227,ok',
				'Germany,not-a-number,ok',
				'France,66277412,ok',
			].join('\n'),
		);

		await expect(
			service.aggregateCsv('agent-1', 'project-1', {
				operation: 'csv_aggregate',
				file: 'file-1',
				groupBy: ['country'],
				metrics: ['population'],
				functions: ['count', 'sum', 'avg'],
				limit: 50,
			}),
		).resolves.toMatchObject({
			fileName: 'data.csv',
			results: [
				expect.objectContaining({
					country: 'Germany',
					count: 2,
					sum_population: 84_086_227,
					avg_population: 84_086_227,
				}),
				expect.objectContaining({
					country: 'France',
					count: 1,
					sum_population: 66_277_412,
					avg_population: 66_277_412,
				}),
			],
			skippedNonNumeric: { population: 1 },
		});
	});
});
