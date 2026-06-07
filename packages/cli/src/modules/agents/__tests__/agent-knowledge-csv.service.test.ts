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
	const knowledgeService = mock<AgentKnowledgeService>();
	knowledgeService.openWorkspaceFileStream.mockResolvedValue({
		file,
		contentStream: Readable.from([content]),
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
		const { service } = makeService(
			'plain text',
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
	});
});
