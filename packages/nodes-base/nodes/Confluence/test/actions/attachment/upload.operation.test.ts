import type { IBinaryData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { description, execute } from '../../../actions/attachment/upload.operation';
import { confluenceApiRequestUpload } from '../../../transport';
import { mockExecuteCtx, testNode } from '../../shared';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequestUpload: vi.fn(),
}));

const apiRequestUpload = vi.mocked(confluenceApiRequestUpload);

const ENDPOINT = '/wiki/rest/api/content/9/child/attachment';

const baseParams: Record<string, unknown> = {
	resource: 'attachment',
	operation: 'upload',
	page: { mode: 'id', value: '9' },
	binaryPropertyName: 'data',
	minorEdit: false,
	comment: '',
};

async function runUpload(overrides: Record<string, unknown> = {}, binary?: Partial<IBinaryData>) {
	const ctx = mockExecuteCtx({ ...baseParams, ...overrides });
	ctx.helpers.assertBinaryData.mockReturnValue({
		data: '',
		mimeType: 'text/plain',
		fileName: 'notes.txt',
		...binary,
	});
	ctx.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('file-bytes'));
	return await execute.call(ctx, 0);
}

/** Reads a named multipart field's value out of a `form-data` body, or undefined if absent. */
function readField(body: string, name: string): string | undefined {
	const match = new RegExp(`name="${name}"\\r?\\n\\r?\\n([^\\r\\n]*)`).exec(body);
	return match?.[1];
}

describe('attachment:upload', () => {
	it('warns that large files are buffered fully in memory', () => {
		const binaryProperty = description.find((p) => p.name === 'binaryPropertyName');
		expect(binaryProperty?.hint).toMatch(/memory/i);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		apiRequestUpload.mockResolvedValue({ results: [{ id: 'att1', title: 'notes.txt' }] });
	});

	it('uploads the binary file and returns the first result', async () => {
		const result = await runUpload();

		expect(apiRequestUpload).toHaveBeenCalledTimes(1);
		const [endpoint, formData] = apiRequestUpload.mock.calls[0];
		expect(endpoint).toBe(ENDPOINT);
		expect(formData.getHeaders()['content-type']).toMatch(/^multipart\/form-data/);
		expect(result).toEqual({ id: 'att1', title: 'notes.txt' });
	});

	it('reads the binary data from the configured property, not always "data"', async () => {
		const ctx = mockExecuteCtx({ ...baseParams, binaryPropertyName: 'file' });
		ctx.helpers.assertBinaryData.mockReturnValue({
			data: '',
			mimeType: 'text/plain',
			fileName: 'notes.txt',
		});
		ctx.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('file-bytes'));

		await execute.call(ctx, 0);

		expect(ctx.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'file');
		expect(ctx.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'file');
	});

	it.each([
		[true, 'true'],
		[false, 'false'],
		// An expression can hand back the string form of either value
		['true', 'true'],
		['false', 'false'],
	])(
		'sends minorEdit=%j as the string %j under its own form field',
		async (minorEdit, expected) => {
			await runUpload({ minorEdit });

			const [, formData] = apiRequestUpload.mock.calls[0];
			expect(readField(formData.getBuffer().toString(), 'minorEdit')).toBe(expected);
		},
	);

	it('omits the comment field when blank', async () => {
		await runUpload({ comment: '  ' });

		const [, formData] = apiRequestUpload.mock.calls[0];
		expect(readField(formData.getBuffer().toString(), 'comment')).toBeUndefined();
	});

	it('includes a trimmed comment field when provided', async () => {
		await runUpload({ comment: '  release notes  ' });

		const [, formData] = apiRequestUpload.mock.calls[0];
		expect(readField(formData.getBuffer().toString(), 'comment')).toBe('release notes');
	});

	it('falls back to the API response when no results array is present', async () => {
		apiRequestUpload.mockResolvedValue({ id: 'att1' });

		const result = await runUpload();

		expect(result).toEqual({ id: 'att1' });
	});

	it('falls back to the raw wrapper when results is an empty array', async () => {
		apiRequestUpload.mockResolvedValue({ results: [] });

		const result = await runUpload();

		expect(result).toEqual({ results: [] });
	});

	it('propagates the error when the configured binary property is missing', async () => {
		const ctx = mockExecuteCtx({ ...baseParams, binaryPropertyName: 'missing' });
		const notFound = new NodeOperationError(
			testNode,
			"No binary data property 'missing' exists on item",
		);
		ctx.helpers.assertBinaryData.mockImplementation(() => {
			throw notFound;
		});

		await expect(execute.call(ctx, 0)).rejects.toBe(notFound);
		expect(apiRequestUpload).not.toHaveBeenCalled();
	});

	it("sends the binary data's mimeType as the file part's Content-Type", async () => {
		await runUpload({}, { mimeType: 'application/pdf', fileName: 'report.pdf' });

		const [, formData] = apiRequestUpload.mock.calls[0];
		expect(formData.getBuffer().toString()).toContain('Content-Type: application/pdf');
	});

	it('falls back to a generic Content-Type when the binary data has no mimeType or usable filename', async () => {
		const result = await runUpload(
			{},
			{ mimeType: undefined as unknown as string, fileName: undefined as unknown as string },
		);

		expect(apiRequestUpload).toHaveBeenCalledTimes(1);
		const [, formData] = apiRequestUpload.mock.calls[0];
		expect(formData.getBuffer().toString()).toContain('Content-Type: application/octet-stream');
		expect(result).toEqual({ id: 'att1', title: 'notes.txt' });
	});
});
