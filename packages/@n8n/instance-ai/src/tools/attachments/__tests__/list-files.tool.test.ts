import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiListedFile } from '../../../types';
import { createListFilesTool, MAX_LISTED_FILES } from '../list-files.tool';

function file(
	index: number,
	origin: InstanceAiListedFile['origin'] = 'upload',
): InstanceAiListedFile {
	return {
		fileId: `file-${index}`,
		fileName: `file-${index}.csv`,
		mimeType: 'text/csv',
		sizeBytes: index,
		origin,
		createdAt: '2026-11-18T10:00:00.000Z',
	};
}

async function run(files: InstanceAiListedFile[]) {
	const list = vi.fn(async () => await Promise.resolve(files));
	const result = await executeTool<{
		conversationFiles: InstanceAiListedFile[];
		omitted?: number;
		files?: unknown;
	}>(createListFilesTool(list), {}, {});
	return { result, list };
}

describe('createListFilesTool', () => {
	it('lists the uploads and the sandbox files of the thread in the order of the host', async () => {
		const { result, list } = await run([file(2, 'sandbox'), file(1)]);

		expect(list).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ conversationFiles: [file(2, 'sandbox'), file(1)] });
	});

	it('does not return the files under `files`, so the chat does not show them as new files', async () => {
		const { result } = await run([file(1)]);

		expect(result.files).toBeUndefined();
	});

	it('gives an empty list for a thread without files', async () => {
		const { result } = await run([]);

		expect(result).toEqual({ conversationFiles: [] });
	});

	it('returns the newest files up to the cap and counts the rest', async () => {
		const files = Array.from({ length: MAX_LISTED_FILES + 3 }, (_, index) => file(index));

		const { result } = await run(files);

		expect(result.conversationFiles).toEqual(files.slice(0, MAX_LISTED_FILES));
		expect(result.omitted).toBe(3);
	});

	it('keeps only the listed fields of each file', async () => {
		const { result } = await run([{ ...file(1), extra: 'secret' } as InstanceAiListedFile]);

		expect(result.conversationFiles[0]).toEqual(file(1));
	});
});
