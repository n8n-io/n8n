import { MAX_AGENT_FILE_SIZE_BYTES } from '@n8n/api-types';

import { InMemoryFilesystem } from '../../__tests__/workspace/test-utils';
import { estimateObservationTokens } from '../model/model-token-counter';
import { guardToolResultForModel, MAX_MODEL_TOOL_RESULT_TOKENS } from '../tools/tool-result-guard';

describe('guardToolResultForModel', () => {
	it('offloads a large uninterrupted result while yielding to the event loop', async () => {
		const filesystem = new InMemoryFilesystem();
		const writeFile = vi.spyOn(filesystem, 'writeFile');
		const output = 'x'.repeat(400_000);
		const serialized = JSON.stringify(output);
		// Load the tokenizer first so its dynamic import cannot count as a yield.
		await estimateObservationTokens('warm up');
		let yielded = false;
		const immediate = setImmediate(() => {
			yielded = true;
		});

		try {
			const guarded = await guardToolResultForModel(output, undefined, {
				filesystem,
				runId: 'run-1',
				toolCallId: 'tc-1',
			});

			expect(yielded).toBe(true);
			expect(guarded).toMatchObject({
				truncated: false,
				offloaded: true,
				historyOutput: { _offloaded: true, originalCharCount: serialized.length },
			});
			expect(guarded.wireOutput).toEqual(guarded.historyOutput);
			const envelope = guarded.historyOutput as { path: string; estimatedTokenCount: number };
			expect(filesystem.getFileContent(envelope.path)).toBe(serialized);
			expect(envelope.estimatedTokenCount).toBeGreaterThan(MAX_MODEL_TOOL_RESULT_TOKENS);
			expect(envelope.estimatedTokenCount).toBeLessThan(Buffer.byteLength(serialized, 'utf8'));
			expect(writeFile).toHaveBeenCalledExactlyOnceWith(
				expect.any(String),
				serialized,
				expect.objectContaining({ recursive: true, overwrite: true }),
			);
		} finally {
			clearImmediate(immediate);
		}
	}, 15_000);

	it.each(['é', '界', '😀', '"\\\n\u0000'])(
		'keeps Unicode and JSON escapes within the truncation token budget: %j',
		async (pattern) => {
			const output = `H${`${pattern} `.repeat(100_000)}T`;
			const serialized = JSON.stringify(output);

			const guarded = await guardToolResultForModel(output);
			const envelope = guarded.historyOutput as {
				head: string;
				tail: string;
				estimatedTokenCount: number;
			};

			expect(guarded).toMatchObject({
				truncated: true,
				offloaded: false,
				historyOutput: { _truncated: true, originalCharCount: serialized.length },
			});
			expect(envelope.estimatedTokenCount).toBeGreaterThan(MAX_MODEL_TOOL_RESULT_TOKENS);
			expect(await estimateObservationTokens(JSON.stringify(envelope))).toBeLessThanOrEqual(
				MAX_MODEL_TOOL_RESULT_TOKENS,
			);
			for (const excerpt of [envelope.head, envelope.tail]) {
				expect(excerpt.length).toBeGreaterThan(0);
				expect(Buffer.from(excerpt, 'utf8').toString('utf8')).toBe(excerpt);
			}
			expect(serialized.startsWith(envelope.head)).toBe(true);
			expect(serialized.endsWith(envelope.tail)).toBe(true);
		},
		15_000,
	);

	it.each(['x', ' ', '😀'])('preserves large results at the token limit: %j', async (pattern) => {
		const filesystem = new InMemoryFilesystem();
		const writeFile = vi.spyOn(filesystem, 'writeFile');
		const output = pattern.repeat(200_000);

		const guarded = await guardToolResultForModel(output, () => MAX_MODEL_TOOL_RESULT_TOKENS, {
			filesystem,
			runId: 'run-1',
			toolCallId: 'tc-1',
		});

		expect(guarded).toEqual({
			truncated: false,
			offloaded: false,
			historyOutput: output,
			wireOutput: output,
		});
		expect(writeFile).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'preserves a uniform-space result below the token limit with storage available: %s',
		async (storageAvailable) => {
			const filesystem = new InMemoryFilesystem();
			const writeFile = vi.spyOn(filesystem, 'writeFile');
			const output = ' '.repeat(5_200_000);

			expect(await estimateObservationTokens(JSON.stringify(output))).toBeLessThanOrEqual(
				MAX_MODEL_TOOL_RESULT_TOKENS,
			);

			const guarded = await guardToolResultForModel(
				output,
				undefined,
				storageAvailable ? { filesystem, runId: 'run-1', toolCallId: 'tc-1' } : undefined,
			);

			expect(guarded).toMatchObject({ truncated: false, offloaded: false });
			expect(guarded.historyOutput).toBe(output);
			expect(guarded.wireOutput).toBe(output);
			expect(writeFile).not.toHaveBeenCalled();
		},
		35_000,
	);

	it.each(['missing', 'read-only', 'failed'] as const)(
		'keeps a token-bounded excerpt above 200 KB with %s storage',
		async (storageMode) => {
			const filesystem = Object.assign(new InMemoryFilesystem(), {
				readOnly: storageMode === 'read-only',
			});
			if (storageMode === 'failed') {
				vi.spyOn(filesystem, 'writeFile').mockRejectedValue(new Error('Storage unavailable'));
			}
			const output = 'word '.repeat(100_000);
			const serialized = JSON.stringify(output);

			expect(await estimateObservationTokens(serialized)).toBeGreaterThan(
				MAX_MODEL_TOOL_RESULT_TOKENS,
			);

			const guarded = await guardToolResultForModel(
				output,
				undefined,
				storageMode === 'missing' ? undefined : { filesystem, runId: 'run-1', toolCallId: 'tc-1' },
			);

			expect(guarded).toMatchObject({
				truncated: true,
				offloaded: false,
				historyOutput: { _truncated: true, originalCharCount: serialized.length },
			});
			expect(guarded.wireOutput).toEqual(guarded.historyOutput);
			const envelope = guarded.historyOutput as { head: string; tail: string };
			expect(serialized.startsWith(envelope.head)).toBe(true);
			expect(serialized.endsWith(envelope.tail)).toBe(true);
			expect(await estimateObservationTokens(JSON.stringify(envelope))).toBeLessThanOrEqual(
				MAX_MODEL_TOOL_RESULT_TOKENS,
			);
			expect(envelope.head.length + envelope.tail.length).toBeGreaterThan(200_000);
		},
	);

	it('truncates without storing a result above the offload size limit', async () => {
		const filesystem = new InMemoryFilesystem();
		const writeFile = vi.spyOn(filesystem, 'writeFile');
		const countTokens = (text: string) => Math.ceil(text.length / 4);

		const guarded = await guardToolResultForModel(
			'x'.repeat(MAX_AGENT_FILE_SIZE_BYTES),
			countTokens,
			{ filesystem, runId: 'run-1', toolCallId: 'tc-1' },
		);

		expect(writeFile).not.toHaveBeenCalled();
		expect(guarded).toMatchObject({ truncated: true, offloaded: false });
		expect(countTokens(JSON.stringify(guarded.historyOutput))).toBeLessThanOrEqual(
			MAX_MODEL_TOOL_RESULT_TOKENS,
		);
	});
});
