import type { IBinaryData, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { BrevoNode } from '../GenericFunctions';

type AttachmentEntry = { content: string; name: string };

function makeContext(overrides: {
	binaryPropertyName: string;
	binaries: Record<string, { metadata: IBinaryData; buffer: Buffer }>;
	itemIndex?: number;
}): IExecuteSingleFunctions {
	const getNodeParameter = jest.fn().mockReturnValue({
		binaryPropertyName: overrides.binaryPropertyName,
	});

	const assertBinaryData = jest.fn((propertyName: string) => {
		const entry = overrides.binaries[propertyName];
		if (!entry) throw new Error(`No binary named ${propertyName}`);
		return entry.metadata;
	});

	// eslint-disable-next-line @typescript-eslint/require-await
	const getBinaryDataBuffer = jest.fn(async (propertyName: string) => {
		const entry = overrides.binaries[propertyName];
		if (!entry) throw new Error(`No binary named ${propertyName}`);
		return entry.buffer;
	});

	return {
		getNodeParameter,
		getItemIndex: jest.fn().mockReturnValue(overrides.itemIndex ?? 0),
		getNode: jest.fn().mockReturnValue({ name: 'Brevo' }),
		helpers: {
			assertBinaryData,
			getBinaryDataBuffer,
		},
	} as unknown as IExecuteSingleFunctions;
}

describe('Brevo - validateAndCompileAttachmentsData', () => {
	const validate = BrevoNode.Validators.validateAndCompileAttachmentsData;

	it('base64-encodes the attachment buffer even when binary storage mode is "filesystem" (data property holds a mode marker, not the payload)', async () => {
		const buffer = Buffer.from('real spreadsheet bytes');
		const ctx = makeContext({
			binaryPropertyName: 'data',
			binaries: {
				data: {
					buffer,
					metadata: {
						// In filesystem/database mode, core sets .data to the mode marker string.
						data: 'filesystem',
						mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						fileName: 'Report.xlsx',
						fileExtension: 'xlsx',
					} as IBinaryData,
				},
			},
		});

		const requestOptions: IHttpRequestOptions = { url: '', body: {} };
		const result = await validate.call(ctx, requestOptions);

		const attachments = (result.body as { attachment: AttachmentEntry[] }).attachment;
		expect(attachments).toHaveLength(1);
		expect(attachments[0].content).toBe(buffer.toString('base64'));
		expect(attachments[0].content).not.toBe('filesystem');
	});

	it('base64-encodes the attachment buffer in database binary storage mode', async () => {
		const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // XLSX magic bytes
		const ctx = makeContext({
			binaryPropertyName: 'data',
			binaries: {
				data: {
					buffer,
					metadata: {
						data: 'database',
						mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						fileName: 'Report.xlsx',
						fileExtension: 'xlsx',
					} as IBinaryData,
				},
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });
		const attachments = (result.body as { attachment: AttachmentEntry[] }).attachment;

		expect(attachments[0].content).toBe(buffer.toString('base64'));
	});

	it('uses the filename as-is when it already contains the extension (no doubling)', async () => {
		const buffer = Buffer.from('payload');
		const ctx = makeContext({
			binaryPropertyName: 'data',
			binaries: {
				data: {
					buffer,
					metadata: {
						data: 'database',
						mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						fileName: 'Report.xlsx',
						fileExtension: 'xlsx',
					} as IBinaryData,
				},
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });
		const attachments = (result.body as { attachment: AttachmentEntry[] }).attachment;

		expect(attachments[0].name).toBe('Report.xlsx');
	});

	it('appends the extension when filename has none', async () => {
		const buffer = Buffer.from('payload');
		const ctx = makeContext({
			binaryPropertyName: 'data',
			binaries: {
				data: {
					buffer,
					metadata: {
						data: '',
						mimeType: 'text/plain',
						fileName: 'notes',
						fileExtension: 'txt',
					} as IBinaryData,
				},
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });
		const attachments = (result.body as { attachment: AttachmentEntry[] }).attachment;

		expect(attachments[0].name).toBe('notes.txt');
	});

	it('falls back to file-<itemIndex>.<ext> when fileName is missing', async () => {
		const buffer = Buffer.from('payload');
		const ctx = makeContext({
			itemIndex: 3,
			binaryPropertyName: 'data',
			binaries: {
				data: {
					buffer,
					metadata: {
						data: '',
						mimeType: 'text/plain',
						fileExtension: 'txt',
					} as IBinaryData,
				},
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });
		const attachments = (result.body as { attachment: AttachmentEntry[] }).attachment;

		expect(attachments[0].name).toBe('file-3.txt');
	});

	it('derives the extension from mimeType when fileExtension is missing', async () => {
		const buffer = Buffer.from('payload');
		const ctx = makeContext({
			binaryPropertyName: 'data',
			binaries: {
				data: {
					buffer,
					metadata: {
						data: '',
						mimeType: 'application/pdf',
						fileName: 'invoice',
					} as IBinaryData,
				},
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });
		const attachments = (result.body as { attachment: AttachmentEntry[] }).attachment;

		expect(attachments[0].name).toBe('invoice.pdf');
	});

	it('processes comma-separated binary property names', async () => {
		const bufferA = Buffer.from('AAAA');
		const bufferB = Buffer.from('BBBB');
		const ctx = makeContext({
			binaryPropertyName: 'fileA,fileB',
			binaries: {
				fileA: {
					buffer: bufferA,
					metadata: {
						data: 'database',
						mimeType: 'text/plain',
						fileName: 'a.txt',
						fileExtension: 'txt',
					} as IBinaryData,
				},
				fileB: {
					buffer: bufferB,
					metadata: {
						data: 'database',
						mimeType: 'text/plain',
						fileName: 'b.txt',
						fileExtension: 'txt',
					} as IBinaryData,
				},
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });
		const attachments = (result.body as { attachment: AttachmentEntry[] }).attachment;

		expect(attachments).toEqual([
			{ content: bufferA.toString('base64'), name: 'a.txt' },
			{ content: bufferB.toString('base64'), name: 'b.txt' },
		]);
	});
});
