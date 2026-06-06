import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ExecuteCommandOptions } from '@n8n/ai-utilities/sandbox';

import { AgentKnowledgeSandboxCsvService } from '../agent-knowledge-sandbox-csv.service';
import { KNOWLEDGE_CSV_RUNNER_MISSING_MESSAGE } from '../agent-knowledge-sandbox-runtime';
import type { KnowledgeSandboxWorkspace } from '../agent-knowledge-sandbox-workspace.service';
import { resolveKnowledgeCsvRunnerArgs } from './knowledge-csv-runner-test-utils';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

describe('AgentKnowledgeSandboxCsvService', () => {
	let service: AgentKnowledgeSandboxCsvService;
	let knowledgeRoot: string;
	let internalRoot: string;
	let workspace: KnowledgeSandboxWorkspace;
	let writeFileMock: jest.Mock;

	beforeEach(async () => {
		service = new AgentKnowledgeSandboxCsvService();
		knowledgeRoot = await mkdtemp(path.join(tmpdir(), 'sandbox-csv-'));
		internalRoot = path.join(knowledgeRoot, '.internal');
		writeFileMock = jest.fn();
		workspace = {
			sandbox: {
				id: 'test-sandbox',
				name: 'Test Sandbox',
				provider: 'n8n-sandbox',
				status: 'running',
				executeCommand: async (command: string, args: string[], options: ExecuteCommandOptions) => {
					return await new Promise((resolve) => {
						const child = spawn(command, resolveKnowledgeCsvRunnerArgs(args), {
							cwd: options.cwd,
							env: { ...process.env, ...options.env },
						});
						let stdout = '';
						let stderr = '';
						let timedOut = false;
						child.stdout.on('data', (chunk: Buffer) => {
							const text = chunk.toString();
							stdout += text;
							options.onStdout?.(text);
						});
						child.stderr.on('data', (chunk: Buffer) => {
							const text = chunk.toString();
							stderr += text;
							options.onStderr?.(text);
						});
						const timer =
							options.timeout !== undefined
								? setTimeout(() => {
										timedOut = true;
										child.kill();
									}, options.timeout)
								: undefined;
						child.on('close', (exitCode) => {
							if (timer) clearTimeout(timer);
							resolve({
								exitCode: exitCode ?? 1,
								stdout,
								stderr,
								timedOut,
							});
						});
					});
				},
			},
			filesystem: {
				writeFile: writeFileMock,
			} as KnowledgeSandboxWorkspace['filesystem'],
			provider: 'n8n-sandbox',
			workspaceRoot: knowledgeRoot,
			knowledgeRoot,
			internalRoot,
			manifestPath: path.join(internalRoot, 'manifest.json'),
		};
	});

	afterEach(async () => {
		await rm(knowledgeRoot, { recursive: true, force: true }).catch(() => {});
	});

	it('does not stage runner source into the workspace', async () => {
		await writeFile(path.join(knowledgeRoot, 'file-1.csv'), 'country,year\nGermany,2022\n');
		const files = [
			{
				id: 'file-1',
				fileName: 'data.csv',
				mimeType: 'text/csv',
				fileSizeBytes: 24,
				relativePath: 'file-1.csv',
			},
		];

		await service.queryCsv(workspace, files, {
			operation: 'csv_query',
			file: 'file-1',
			select: ['country', 'year'],
			limit: 20,
		});

		expect(writeFileMock).not.toHaveBeenCalled();
	});

	it('queries CSV rows inside the sandbox runner', async () => {
		await writeFile(
			path.join(knowledgeRoot, 'file-1.csv'),
			['country,year,population', 'Germany,2022,84086227', 'France,2022,66277412'].join('\n'),
		);
		const files = [
			{
				id: 'file-1',
				fileName: 'data.csv',
				mimeType: 'text/csv',
				fileSizeBytes: 80,
				relativePath: 'file-1.csv',
			},
		];

		await expect(
			service.queryCsv(workspace, files, {
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
	});

	it('returns column validation errors without leaking absolute paths', async () => {
		await writeFile(path.join(knowledgeRoot, 'file-1.csv'), 'country,year\nGermany,2022\n');
		const files = [
			{
				id: 'file-1',
				fileName: 'data.csv',
				mimeType: 'text/csv',
				fileSizeBytes: 24,
				relativePath: 'file-1.csv',
			},
		];

		await expect(
			service.queryCsv(workspace, files, {
				operation: 'csv_query',
				file: 'file-1',
				select: ['missing-column'],
				limit: 20,
			}),
		).rejects.toThrow('CSV column "missing-column" not found in "data.csv"');
	});

	it('rejects sandboxes missing the baked CSV runner', async () => {
		const workspaceWithoutRunner = {
			...workspace,
			sandbox: {
				...workspace.sandbox,
				executeCommand: jest.fn(async () => ({
					exitCode: 1,
					stdout: '',
					stderr: 'No such file',
					timedOut: false,
				})),
			},
		};

		await expect(
			service.queryCsv(
				workspaceWithoutRunner,
				[
					{
						id: 'file-1',
						fileName: 'data.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 24,
						relativePath: 'file-1.csv',
					},
				],
				{
					operation: 'csv_query',
					file: 'file-1',
					select: ['country'],
					limit: 20,
				},
			),
		).rejects.toThrow(KNOWLEDGE_CSV_RUNNER_MISSING_MESSAGE);
	});

	it('rejects command execution when sandbox does not support it', async () => {
		const workspaceWithoutCommands = {
			...workspace,
			sandbox: {
				...workspace.sandbox,
				executeCommand: undefined,
			},
		};

		await expect(
			service.queryCsv(
				workspaceWithoutCommands,
				[
					{
						id: 'file-1',
						fileName: 'data.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 24,
						relativePath: 'file-1.csv',
					},
				],
				{
					operation: 'csv_query',
					file: 'file-1',
					select: ['country'],
					limit: 20,
				},
			),
		).rejects.toThrow('Agent knowledge sandbox does not support command execution');
	});
});
