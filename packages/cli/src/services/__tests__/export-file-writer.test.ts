import type { Logger } from '@n8n/backend-common';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises';
import type { Cipher } from 'n8n-core';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { ExportFileWriter } from '../export-file-writer';

const rowsWithIds = (firstId: number, count: number): Array<{ id: number }> =>
	Array.from({ length: count }, (_, i) => ({ id: firstId + i }));

describe('ExportFileWriter', () => {
	const encryptV2 = vi.fn(async (data: string, _key?: string) => `encrypted:${data}`);
	const writer = new ExportFileWriter(mock<Logger>(), mock<Cipher>({ encryptV2 }));
	let outputDir: string;

	beforeEach(async () => {
		outputDir = await mkdtemp(join(tmpdir(), 'export-file-writer-'));
	});

	afterEach(async () => {
		await rm(outputDir, { recursive: true, force: true });
	});

	test('writes the rows to <name>.jsonl, then to <name>.2.jsonl after 500 rows', async () => {
		const file = await writer.open(outputDir, 'user');
		await file.append(rowsWithIds(1, 500));
		await file.append(rowsWithIds(501, 500));
		await file.append(rowsWithIds(1001, 1));

		expect((await readdir(outputDir)).sort()).toEqual([
			'user.2.jsonl',
			'user.3.jsonl',
			'user.jsonl',
		]);
	});

	test('starts a new file only after the earlier appends wrote 500 rows', async () => {
		const file = await writer.open(outputDir, 'user');
		await file.append(rowsWithIds(1, 200));
		await file.append(rowsWithIds(201, 200));

		expect(await readdir(outputDir)).toEqual(['user.jsonl']);
	});

	test('writes each append as one encrypted block followed by a newline', async () => {
		const file = await writer.open(outputDir, 'user', 'custom-key');
		await file.append([{ id: 1 }, { id: 2 }]);
		await file.append([{ id: 3 }]);

		expect(await readFile(join(outputDir, 'user.jsonl'), 'utf8')).toBe(
			'encrypted:{"id":1}\n{"id":2}\nencrypted:{"id":3}\n',
		);
		expect(encryptV2).toHaveBeenCalledWith('{"id":3}', 'custom-key');
	});

	test('deletes the old files of the same name when it opens', async () => {
		const existing = [
			'user.jsonl',
			'user.2.jsonl',
			'user_role.jsonl',
			'workflow.jsonl',
			'user.txt',
		];
		for (const name of existing) await writeFile(join(outputDir, name), 'old');

		await writer.open(outputDir, 'user');

		expect((await readdir(outputDir)).sort()).toEqual([
			'user.txt',
			'user_role.jsonl',
			'workflow.jsonl',
		]);
	});

	test('reports the rows and files it wrote', async () => {
		const file = await writer.open(outputDir, 'user');
		await file.append(rowsWithIds(1, 500));
		await file.append(rowsWithIds(501, 2));

		expect(file.close()).toEqual({ rows: 502, files: 2 });
	});
});
