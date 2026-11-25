import type { IExecutionResponse } from '@n8n/db';
import type { IBinaryData, INodeExecutionData, IRunData } from 'n8n-workflow';

import {
	MAX_RUN_OUTPUT_FILES,
	MAX_RUN_SKIPPED_FILES,
	storeRunOutputFiles,
} from '../instance-ai-run-output-files';

function binary(id: string, fileName = `${id}.png`): IBinaryData {
	return { id: `filesystem-v2:${id}`, data: 'filesystem-v2', mimeType: 'image/png', fileName };
}

function runOf(nodes: Record<string, INodeExecutionData[]>): IRunData {
	return Object.fromEntries(
		Object.entries(nodes).map(([name, items]) => [
			name,
			[{ startTime: 0, executionTime: 0, executionIndex: 0, source: [], data: { main: [items] } }],
		]),
	);
}

function executionOf(runData: IRunData, redacted = false): IExecutionResponse {
	return {
		data: {
			resultData: { runData },
			...(redacted
				? { redactionInfo: { isRedacted: true, reason: 'policy', canReveal: false } }
				: {}),
		},
	} as unknown as IExecutionResponse;
}

const storedFile = (b: IBinaryData) => ({
	fileId: `file-${b.fileName}`,
	fileName: b.fileName ?? 'file',
	mimeType: b.mimeType,
	sizeBytes: 3,
});

describe('storeRunOutputFiles', () => {
	it('stores the files of the last node one time each, and not the files of earlier nodes', async () => {
		const storeOutputFile = vi.fn(async (b: IBinaryData) => storedFile(b));
		const shared = binary('a');
		const execution = executionOf(
			runOf({
				Download: [{ json: {}, binary: { data: binary('early') } }],
				Resize: [
					{ json: {}, binary: { data: shared } },
					{ json: {}, binary: { data: shared, thumb: binary('b') } },
				],
			}),
		);

		const result = await storeRunOutputFiles(execution, storeOutputFile);

		expect(storeOutputFile.mock.calls.map(([b]) => b.id)).toEqual([
			'filesystem-v2:a',
			'filesystem-v2:b',
		]);
		expect(result).toEqual({ files: [storedFile(binary('a')), storedFile(binary('b'))] });
	});

	it('lists the files that were not stored', async () => {
		const storeOutputFile = vi.fn(async (b: IBinaryData) => ({
			fileName: b.fileName ?? 'file',
			reason: 'larger than 50 MB',
		}));
		const execution = executionOf(runOf({ Resize: [{ json: {}, binary: { data: binary('a') } }] }));

		await expect(storeRunOutputFiles(execution, storeOutputFile)).resolves.toEqual({
			skippedFiles: [{ fileName: 'a.png', reason: 'larger than 50 MB' }],
		});
	});

	it(`stores at most ${MAX_RUN_OUTPUT_FILES} files of one run`, async () => {
		const storeOutputFile = vi.fn(async (b: IBinaryData) => storedFile(b));
		const items = Array.from({ length: MAX_RUN_OUTPUT_FILES + 2 }, (_, index) => ({
			json: {},
			binary: { data: binary(`f${index}`) },
		}));

		const result = await storeRunOutputFiles(executionOf(runOf({ Split: items })), storeOutputFile);

		expect(storeOutputFile).toHaveBeenCalledTimes(MAX_RUN_OUTPUT_FILES);
		expect(result.files).toHaveLength(MAX_RUN_OUTPUT_FILES);
		expect(result.skippedFiles).toHaveLength(2);
		expect(result).not.toHaveProperty('moreSkippedFiles');
	});

	it(`lists at most ${MAX_RUN_SKIPPED_FILES} skipped files and counts the others`, async () => {
		const storeOutputFile = vi.fn(async (b: IBinaryData) => storedFile(b));
		const total = MAX_RUN_OUTPUT_FILES + MAX_RUN_SKIPPED_FILES + 5;
		const items = Array.from({ length: total }, (_, index) => ({
			json: {},
			binary: { data: binary(`f${index}`) },
		}));

		const result = await storeRunOutputFiles(executionOf(runOf({ Split: items })), storeOutputFile);

		expect(result.files).toHaveLength(MAX_RUN_OUTPUT_FILES);
		expect(result.skippedFiles).toHaveLength(MAX_RUN_SKIPPED_FILES);
		expect(result.moreSkippedFiles).toBe(5);
	});

	it('counts the files that storage rejects against the same list cap', async () => {
		const storeOutputFile = vi.fn(async (b: IBinaryData) => ({
			fileName: b.fileName ?? 'file',
			reason: 'larger than 50 MB',
		}));
		const items = Array.from({ length: MAX_RUN_SKIPPED_FILES + 1 }, (_, index) => ({
			json: {},
			binary: { data: binary(`f${index}`) },
		}));

		const result = await storeRunOutputFiles(executionOf(runOf({ Split: items })), storeOutputFile);

		expect(result.skippedFiles).toHaveLength(MAX_RUN_SKIPPED_FILES);
		expect(result.moreSkippedFiles).toBe(1);
	});

	it('stores nothing from a redacted execution', async () => {
		const storeOutputFile = vi.fn();
		const execution = executionOf(
			runOf({ Resize: [{ json: {}, binary: { data: binary('a') } }] }),
			true,
		);

		await expect(storeRunOutputFiles(execution, storeOutputFile)).resolves.toEqual({});
		expect(storeOutputFile).not.toHaveBeenCalled();
	});
});
