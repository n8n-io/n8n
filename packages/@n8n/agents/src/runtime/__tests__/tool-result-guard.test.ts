import { MAX_AGENT_FILE_SIZE_BYTES } from '@n8n/api-types';

import { InMemoryFilesystem } from '../../__tests__/workspace/test-utils';
import { estimateObservationTokens } from '../model/model-token-counter';
import {
	guardToolResultForModel,
	MAX_EXACT_TOKENIZATION_BYTES,
	MAX_MODEL_TOOL_RESULT_TOKENS,
} from '../tools/tool-result-guard';

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
		const envelope = guarded.historyOutput as { path: string; estimatedTokenCount: number };
		expect(filesystem.getFileContent(envelope.path)).toBe(serialized);
		expect(envelope.estimatedTokenCount).toBeGreaterThanOrEqual(
			Buffer.byteLength(serialized, 'utf8'),
		);
		expect(writeFile).toHaveBeenCalledExactlyOnceWith(
			expect.any(String),
			serialized,
			expect.objectContaining({ recursive: true, overwrite: true }),
		);
		expect(countTokens).toHaveBeenCalledTimes(0);
	});

	it.each(['é', '界', '😀', '"\\\n\u0000'])(
		'keeps Unicode and JSON escapes within the truncation byte budget: %j',
		async (pattern) => {
			const output = `H${pattern.repeat(100_000)}T`;
			const serialized = JSON.stringify(output);
			const countTokens = vi.fn().mockReturnValue(0);

			const guarded = await guardToolResultForModel(output, countTokens);
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
			expect(envelope.estimatedTokenCount).toBeGreaterThanOrEqual(
				Buffer.byteLength(serialized, 'utf8'),
			);
			expect(Buffer.byteLength(JSON.stringify(envelope), 'utf8')).toBeLessThanOrEqual(
				MAX_MODEL_TOOL_RESULT_TOKENS,
			);
			for (const excerpt of [envelope.head, envelope.tail]) {
				expect(excerpt.length).toBeGreaterThan(0);
				expect(Buffer.from(excerpt, 'utf8').toString('utf8')).toBe(excerpt);
			}
			expect(serialized.startsWith(envelope.head)).toBe(true);
			expect(serialized.endsWith(envelope.tail)).toBe(true);
			expect(countTokens).not.toHaveBeenCalled();
		},
	);

	it.each([
		['x', MAX_EXACT_TOKENIZATION_BYTES - 1],
		[' ', MAX_EXACT_TOKENIZATION_BYTES - 1],
		['😀', MAX_EXACT_TOKENIZATION_BYTES / 4],
	] as const)('offloads results above the byte cutoff: %j', async (pattern, repetitions) => {
		const filesystem = new InMemoryFilesystem();
		const output = pattern.repeat(repetitions);
		const countTokens = vi.fn().mockReturnValue(0);

		const guarded = await guardToolResultForModel(output, countTokens, {
			filesystem,
			runId: 'run-1',
			toolCallId: 'tc-1',
		});

		expect(guarded).toMatchObject({ truncated: false, offloaded: true });
		expect(countTokens).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'preserves a uniform-space result below the token limit with storage available: %s',
		async (storageAvailable) => {
			const filesystem = new InMemoryFilesystem();
			const writeFile = vi.spyOn(filesystem, 'writeFile');
			const output = ' '.repeat(MAX_EXACT_TOKENIZATION_BYTES - 2);
			const countTokens = vi.fn(estimateObservationTokens);

			const guarded = await guardToolResultForModel(
				output,
				countTokens,
				storageAvailable ? { filesystem, runId: 'run-1', toolCallId: 'tc-1' } : undefined,
			);

			expect(guarded.truncated).toBe(false);
			expect(guarded.offloaded).toBe(false);
			expect(guarded.historyOutput).toBe(output);
			expect(guarded.wireOutput).toBe(output);
			expect(writeFile).not.toHaveBeenCalled();
			expect(countTokens).toHaveBeenCalledExactlyOnceWith(JSON.stringify(output));
		},
		35_000,
	);

	// AGENT-1568: Byte size must not replace the model's token budget.
	it.each([false, true])(
		'preserves a 5.2 MB space result within the token limit with storage available: %s',
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

	it('keeps a token-bounded excerpt above 200 KB when storage is unavailable', async () => {
		const output = 'word '.repeat(100_000);
		const serialized = JSON.stringify(output);

		expect(await estimateObservationTokens(serialized)).toBeGreaterThan(
			MAX_MODEL_TOOL_RESULT_TOKENS,
		);

		const guarded = await guardToolResultForModel(output);

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
	});

	it('truncates without storing a result above the offload size limit', async () => {
		const filesystem = new InMemoryFilesystem();
		const writeFile = vi.spyOn(filesystem, 'writeFile');
		const countTokens = vi.fn((text: string) => Math.ceil(text.length / 4));

		const guarded = await guardToolResultForModel(
			'x'.repeat(MAX_AGENT_FILE_SIZE_BYTES),
			countTokens,
			{ filesystem, runId: 'run-1', toolCallId: 'tc-1' },
		);

		expect(writeFile).not.toHaveBeenCalled();
		expect(guarded).toMatchObject({ truncated: true, offloaded: false });
		expect(countTokens).not.toHaveBeenCalled();
	});
});
