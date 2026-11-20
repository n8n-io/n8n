import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiStoredFile } from '../../../types';
import { createViewFileTool } from '../view-file.tool';

function storedFile(overrides: Partial<InstanceAiStoredFile> = {}): InstanceAiStoredFile {
	return {
		fileName: 'hat.png',
		mimeType: 'image/png',
		sizeBytes: 1234,
		hasContent: vi.fn(async () => await Promise.resolve(true)),
		readContent: vi.fn(async () => await Promise.resolve(Buffer.from('png'))),
		...overrides,
	};
}

const VIEWABLE = new Set(['image/png', 'application/pdf']);

/** `null` stands for a file that the thread does not have. */
function setup(file: InstanceAiStoredFile | null = storedFile()) {
	const storedFiles = {
		read: vi.fn(async () => await Promise.resolve(file ?? undefined)),
		// The host decides from the provider of the model.
		canView: vi.fn((mimeType: string) => VIEWABLE.has(mimeType)),
	};
	const tool = createViewFileTool(storedFiles);
	const view = async (fileId = 'file-1') =>
		await executeTool<Record<string, unknown>>(tool, { fileId }, {});
	return { tool, storedFiles, view };
}

describe('createViewFileTool', () => {
	it('attaches an image of the thread as a file reference, without loading its bytes', async () => {
		const file = storedFile();
		const { tool, storedFiles, view } = setup(file);

		const output = await view();

		expect(storedFiles.read).toHaveBeenCalledWith('file-1');
		expect(storedFiles.canView).toHaveBeenCalledWith('image/png');
		expect(file.readContent).not.toHaveBeenCalled();
		expect(output).toEqual({
			viewedFile: { fileId: 'file-1', fileName: 'hat.png', mimeType: 'image/png', sizeBytes: 1234 },
		});
		expect(tool.toModelOutput!(output)).toEqual({
			type: 'content',
			value: [
				{ type: 'text', text: expect.stringContaining('"fileId":"file-1"') },
				{
					type: 'file',
					mediaType: 'image/png',
					fileRef: { id: 'file-1', fileName: 'hat.png', sizeBytes: 1234 },
				},
			],
		});
	});

	it('attaches a PDF', async () => {
		const { view } = setup(storedFile({ fileName: 'report.pdf', mimeType: 'application/pdf' }));

		await expect(view()).resolves.toMatchObject({ viewedFile: { mimeType: 'application/pdf' } });
	});

	it('does not return the file under `files`, so the chat does not show it again', async () => {
		const { view } = setup();

		await expect(view()).resolves.not.toHaveProperty('files');
	});

	it.each([
		['a file of another thread', null, 'not found in this conversation'],
		[
			'an image type the model cannot see',
			storedFile({ mimeType: 'image/webp' }),
			'cannot view files of type "image/webp"',
		],
		['a document', storedFile({ mimeType: 'text/csv' }), 'cannot view files of type "text/csv"'],
		[
			'a file over the attachment cap',
			storedFile({ sizeBytes: MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES + 1 }),
			'cannot be viewed',
		],
		[
			'a file whose bytes storage pruned',
			storedFile({ hasContent: vi.fn(async () => await Promise.resolve(false)) }),
			'no longer available',
		],
	])('gives an error and no file reference for %s', async (_label, file, message) => {
		const { tool, view } = setup(file);

		const output = await view();

		expect(output.viewedFile).toBeUndefined();
		expect(output.error).toEqual(expect.stringContaining(message));
		expect(tool.toModelOutput!(output)).toEqual({ type: 'text', value: JSON.stringify(output) });
	});
});
