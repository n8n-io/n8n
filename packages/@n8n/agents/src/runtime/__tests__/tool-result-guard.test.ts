import { MAX_AGENT_FILE_SIZE_BYTES } from '@n8n/api-types';

import { InMemoryFilesystem } from '../../__tests__/workspace/test-utils';
import { guardToolResultForModel } from '../tools/tool-result-guard';

describe('guardToolResultForModel', () => {
	it('offloads a large uninterrupted result without exact tokenization', async () => {
		const filesystem = new InMemoryFilesystem();
		const writeFile = vi.spyOn(filesystem, 'writeFile');
		const output = 'x'.repeat(400_000);
		const serialized = JSON.stringify(output);
		// AGENT-662: Observe full-payload tokenization without blocking the test on BPE encoding.
		const countTokens = vi.fn((text: string) => Math.ceil(text.length / 4));

		const guarded = await guardToolResultForModel(output, countTokens, {
			filesystem,
			runId: 'run-1',
			toolCallId: 'tc-1',
		});

		expect(guarded).toMatchObject({
			truncated: false,
			offloaded: true,
			historyOutput: { _offloaded: true, originalCharCount: serialized.length },
		});
		expect(guarded.wireOutput).toEqual(guarded.historyOutput);
		expect(writeFile).toHaveBeenCalledExactlyOnceWith(
			expect.any(String),
			serialized,
			expect.objectContaining({ recursive: true, overwrite: true }),
		);
		expect(countTokens).toHaveBeenCalledTimes(0);
	});

	it.each([false, true])(
		'preserves a uniform-space result below the token limit with storage available: %s',
		async (storageAvailable) => {
			const filesystem = new InMemoryFilesystem();
			const writeFile = vi.spyOn(filesystem, 'writeFile');
			const output = ' '.repeat(5_200_000);

			const guarded = await guardToolResultForModel(
				output,
				undefined,
				storageAvailable ? { filesystem, runId: 'run-1', toolCallId: 'tc-1' } : undefined,
			);

			expect(guarded.truncated).toBe(false);
			expect(guarded.offloaded).toBe(false);
			expect(guarded.historyOutput).toBe(output);
			expect(guarded.wireOutput).toBe(output);
			expect(writeFile).not.toHaveBeenCalled();
		},
		35_000,
	);

	it('truncates without storing a result above the offload size limit', async () => {
		const filesystem = new InMemoryFilesystem();
		const writeFile = vi.spyOn(filesystem, 'writeFile');
		const countTokens = async (text: string) => await Promise.resolve(Math.ceil(text.length / 4));

		const guarded = await guardToolResultForModel(
			'x'.repeat(MAX_AGENT_FILE_SIZE_BYTES),
			countTokens,
			{ filesystem, runId: 'run-1', toolCallId: 'tc-1' },
		);

		expect(writeFile).not.toHaveBeenCalled();
		expect(guarded).toMatchObject({ truncated: true, offloaded: false });
	});
});
