import type { IExecutionResponse } from '@n8n/db';
import type { IBinaryData, INodeExecutionData, IRunData } from 'n8n-workflow';

import {
	MAX_RUN_OUTPUT_FILES,
	extractNodeOutput,
	storeRunOutputFiles,
} from '../instance-ai.adapter.service';

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
		id: 'exec-1',
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

describe('extractNodeOutput with files', () => {
	const execution = executionOf(
		runOf({
			Resize: [
				{ json: { n: 0 }, binary: { data: binary('a') } },
				{ json: { n: 1 } },
				{ json: { n: 2 }, binary: { data: binary('b'), thumb: binary('c') } },
			],
		}),
	);

	it('counts the files of the returned items and stores nothing without storeFile', async () => {
		const result = await extractNodeOutput(execution, 'Resize', { startIndex: 1 });

		expect(result.binaryFileCount).toBe(2);
		expect(result).not.toHaveProperty('files');
	});

	it('stores only the files of the returned page', async () => {
		const storeFile = vi.fn(async (b: IBinaryData) => storedFile(b));

		const result = await extractNodeOutput(execution, 'Resize', { maxItems: 2, storeFile });

		expect(storeFile.mock.calls.map(([b]) => b.id)).toEqual(['filesystem-v2:a']);
		expect(result.files).toEqual([storedFile(binary('a'))]);
		expect(result.binaryFileCount).toBe(1);
	});

	it('stores nothing from a redacted execution', async () => {
		const storeFile = vi.fn();
		const redacted = executionOf(
			runOf({ Resize: [{ json: {}, binary: { data: binary('a') } }] }),
			true,
		);

		const result = await extractNodeOutput(redacted, 'Resize', { storeFile });

		expect(storeFile).not.toHaveBeenCalled();
		expect(result).not.toHaveProperty('files');
	});
});
