import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { getKnowledgeCsvRunnerAssetPath } from '../agent-knowledge-sandbox-runtime';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

async function runRunner(input: unknown, cwd: string) {
	const encoded = Buffer.from(JSON.stringify(input), 'utf8').toString('base64');
	return await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
		const child = spawn('node', [getKnowledgeCsvRunnerAssetPath()], {
			cwd,
			env: { ...process.env, N8N_KNOWLEDGE_CSV_INPUT_B64: encoded },
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on('close', (exitCode) => {
			resolve({ exitCode: exitCode ?? 1, stdout, stderr });
		});
	});
}

describe('knowledge-csv-runner.cjs', () => {
	let cwd: string;

	beforeEach(async () => {
		cwd = await mkdtemp(path.join(tmpdir(), 'csv-runner-direct-'));
	});

	afterEach(async () => {
		await rm(cwd, { recursive: true, force: true }).catch(() => {});
	});

	it('prints version with --version', async () => {
		const result = await new Promise<{ exitCode: number; stdout: string }>((resolve) => {
			const child = spawn('node', [getKnowledgeCsvRunnerAssetPath(), '--version']);
			let stdout = '';
			child.stdout.on('data', (chunk: Buffer) => {
				stdout += chunk.toString();
			});
			child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? 1, stdout }));
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe('1');
	});

	it('queries CSV rows with quoted headers', async () => {
		await writeFile(
			path.join(cwd, 'file-1.csv'),
			['"country,name",year', '"Germany,Federal Republic",2022'].join('\n'),
		);

		const result = await runRunner(
			{
				version: 1,
				files: [
					{
						id: 'file-1',
						fileName: 'quoted.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 53,
						relativePath: 'file-1.csv',
					},
				],
				input: {
					operation: 'csv_query',
					file: 'file-1',
					select: ['country,name', 'year'],
					limit: 20,
				},
			},
			cwd,
		);

		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.stdout) as { ok: boolean; result: { rows: string[][] } };
		expect(parsed.ok).toBe(true);
		expect(parsed.result.rows).toEqual([['Germany,Federal Republic', '2022']]);
	});

	it('profiles CSV columns with inferred types', async () => {
		await writeFile(
			path.join(cwd, 'file-1.csv'),
			['Year,Mean,Reviewed', '1880,-0.12,true', '1881,-0.09,false'].join('\n'),
		);

		const result = await runRunner(
			{
				version: 1,
				files: [
					{
						id: 'file-1',
						fileName: 'temperature.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 60,
						relativePath: 'file-1.csv',
					},
				],
				input: {
					operation: 'csv_profile',
					file: 'file-1',
					sampleSize: 2,
				},
			},
			cwd,
		);

		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.stdout) as {
			ok: boolean;
			result: { columnProfiles: Array<{ name: string; inferredType: string }> };
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.result.columnProfiles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'Year', inferredType: 'integer' }),
				expect.objectContaining({ name: 'Mean', inferredType: 'number' }),
				expect.objectContaining({ name: 'Reviewed', inferredType: 'boolean' }),
			]),
		);
	});

	it('returns column suggestions for missing columns', async () => {
		await writeFile(path.join(cwd, 'file-1.csv'), 'country,year\nGermany,2022\n');

		const result = await runRunner(
			{
				version: 1,
				files: [
					{
						id: 'file-1',
						fileName: 'data.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 24,
						relativePath: 'file-1.csv',
					},
				],
				input: {
					operation: 'csv_query',
					file: 'file-1',
					select: ['countryy'],
					limit: 20,
				},
			},
			cwd,
		);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain('Did you mean "country"?');
	});
});
