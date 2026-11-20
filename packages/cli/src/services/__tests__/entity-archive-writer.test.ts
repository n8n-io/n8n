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
	beforeEach(() => {
		vi.mocked(appendFile).mockClear();
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
		const outputDir = join(tmpdir(), 'n8n-entity-archive-writer-test');
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
