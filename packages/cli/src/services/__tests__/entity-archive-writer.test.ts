import type { Logger } from '@n8n/backend-common';
import { appendFile } from 'fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { EntityArchiveWriter } from '../entity-archive-writer';

vi.mock('fs/promises', async (importOriginal) => ({
	...(await importOriginal<typeof import('fs/promises')>()),
	appendFile: vi.fn(),
}));

describe('EntityArchiveWriter', () => {
	const outputDir = join(tmpdir(), 'n8n-entity-archive-writer-test');

	beforeEach(() => {
		vi.mocked(appendFile).mockClear();
	});

	it('splits a page before a row would take a line past 32 MiB', async () => {
		const lineLimit = 32 * 1024 * 1024;
		const encrypt = vi.fn<(text: string) => Promise<string>>().mockResolvedValue('ciphertext');
		const writer = new EntityArchiveWriter(outputDir, 'entities', encrypt, mock<Logger>(), 'rows');

		// The first two rows fill a line exactly, including the newline between them.
		await writer.append('a'.repeat(lineLimit - 2));
		await writer.append('b');
		expect(encrypt).not.toHaveBeenCalled();

		await writer.append('c');
		expect(encrypt).toHaveBeenCalledTimes(1);

		await writer.endPage();
		expect(encrypt.mock.calls.map(([line]) => [line.length, line.slice(-2)])).toEqual([
			[lineLimit, '\nb'],
			[1, 'c'],
		]);
	});

	it('fills a file to exactly 64 MiB before writing the next line to a new file', async () => {
		const halfFileBytes = 32 * 1024 * 1024;
		// Each of the first two encrypted lines fills half the file, including its newline.
		const ciphertext = 'a'.repeat(halfFileBytes - 1);
		const encrypt = vi
			.fn<(text: string) => Promise<string>>()
			.mockResolvedValueOnce(ciphertext)
			.mockResolvedValueOnce(ciphertext)
			.mockResolvedValue('b');
		const writer = new EntityArchiveWriter(outputDir, 'entities', encrypt, mock<Logger>(), 'rows');

		for (const id of [1, 2, 3]) {
			await writer.append(JSON.stringify({ id }));
			await writer.endPage();
		}

		expect(writer.endTable()).toBe(2);
		expect(encrypt.mock.calls).toEqual([['{"id":1}'], ['{"id":2}'], ['{"id":3}']]);
		const writes = vi
			.mocked(appendFile)
			.mock.calls.map(([path, line]) => [path, String(line).length]);
		expect(writes).toEqual([
			[join(outputDir, 'entities.jsonl'), halfFileBytes],
			[join(outputDir, 'entities.jsonl'), halfFileBytes],
			[join(outputDir, 'entities.2.jsonl'), 2],
		]);
	});
});
