import type { IBinaryData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { description, execute } from '../../../actions/attachment/getMany.operation';
import { confluenceApiRequest, confluenceApiRequestBinary } from '../../../transport';
import { mockExecuteCtx } from '../../shared';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
	confluenceApiRequestBinary: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);
const binaryRequest = vi.mocked(confluenceApiRequestBinary);

const ENDPOINT = '/wiki/api/v2/pages/9/attachments';

const baseParams: Record<string, unknown> = {
	resource: 'attachment',
	operation: 'getMany',
	page: { mode: 'id', value: '9' },
	returnAll: false,
	limit: 100,
	download: false,
};

function attachmentPage(records: Array<Record<string, unknown>>, next?: string) {
	return {
		results: records,
		...(next === undefined ? {} : { _links: { next } }),
	};
}

async function runGetMany(overrides: Record<string, unknown> = {}) {
	const ctx = mockExecuteCtx({ ...baseParams, ...overrides });
	ctx.helpers.prepareBinaryData.mockImplementation(
		async (buffer, fileName, mimeType): Promise<IBinaryData> => ({
			data: (buffer as Buffer).toString('base64'),
			fileName,
			mimeType: mimeType ?? 'application/octet-stream',
		}),
	);
	return await execute.call(ctx, 0);
}

describe('attachment:getMany', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue(attachmentPage([]));
		binaryRequest.mockResolvedValue(Buffer.from('file-bytes'));
	});

	it('keeps the field-specific display conditions alongside the operation scoping', () => {
		const limitProperty = description.find((p) => p.name === 'limit');
		expect(limitProperty?.displayOptions?.show).toEqual({
			resource: ['attachment'],
			operation: ['getMany'],
			returnAll: [false],
		});

		const binaryProperty = description.find((p) => p.name === 'binaryPropertyName');
		expect(binaryProperty?.displayOptions?.show).toEqual({
			resource: ['attachment'],
			operation: ['getMany'],
			download: [true],
		});
	});

	it('lists attachments and returns one item per record', async () => {
		apiRequest.mockResolvedValue(
			attachmentPage([
				{ id: 'a1', title: 'notes.txt', mediaType: 'text/plain', fileSize: 5 },
				{ id: 'a2', title: 'plan.pdf', mediaType: 'application/pdf', fileSize: 9 },
			]),
		);

		const result = await runGetMany();

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 100 });
		expect(result).toEqual([
			{ json: { id: 'a1', title: 'notes.txt', mediaType: 'text/plain', fileSize: 5 } },
			{ json: { id: 'a2', title: 'plan.pdf', mediaType: 'application/pdf', fileSize: 9 } },
		]);
	});

	it('paginates with the next cursor until exhausted', async () => {
		apiRequest
			.mockResolvedValueOnce(attachmentPage([{ id: 'a1' }], `${ENDPOINT}?cursor=c1`))
			.mockResolvedValueOnce(attachmentPage([{ id: 'a2' }]));

		const result = await runGetMany({ returnAll: true });

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(1, 'GET', ENDPOINT, {}, { limit: 250 });
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			ENDPOINT,
			{},
			{ limit: 250, cursor: 'c1' },
		);
		expect(result).toEqual([{ json: { id: 'a1' } }, { json: { id: 'a2' } }]);
	});

	it('stops fetching once the limit is met and truncates', async () => {
		apiRequest.mockResolvedValue(
			attachmentPage([{ id: 'a1' }, { id: 'a2' }], `${ENDPOINT}?cursor=c1`),
		);

		const result = await runGetMany({ limit: 1 });

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 1 });
		expect(result).toEqual([{ json: { id: 'a1' } }]);
	});

	it('stops when the next cursor revisits an earlier page', async () => {
		apiRequest.mockResolvedValue(attachmentPage([{ id: 'a1' }], `${ENDPOINT}?cursor=same`));

		await runGetMany({ returnAll: true });

		expect(apiRequest).toHaveBeenCalledTimes(2);
	});

	it('rejects a non-positive limit from an expression', async () => {
		const promise = runGetMany({ limit: 0 });

		await expect(promise).rejects.toThrow('Limit must be a finite number of at least 1');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('downloads each attachment into the binary field', async () => {
		apiRequest.mockResolvedValue(
			attachmentPage([
				{
					id: 'a1',
					title: 'notes.txt',
					mediaType: 'text/plain',
					downloadLink: '/download/attachments/9/notes.txt?version=1&api=v2',
				},
			]),
		);

		const result = await runGetMany({ download: true });

		expect(binaryRequest).toHaveBeenCalledWith(
			'/wiki/download/attachments/9/notes.txt?version=1&api=v2',
		);
		expect(result).toEqual([
			{
				json: expect.objectContaining({ id: 'a1' }),
				binary: {
					data: {
						data: Buffer.from('file-bytes').toString('base64'),
						fileName: 'notes.txt',
						mimeType: 'text/plain',
					},
				},
			},
		]);
	});

	it('percent-encodes raw filename characters while keeping the query string intact', async () => {
		apiRequest.mockResolvedValue(
			attachmentPage([
				{
					id: 'a1',
					title: 'report #3.pdf',
					downloadLink: '/download/attachments/9/report #3.pdf?version=1&api=v2',
				},
			]),
		);

		await runGetMany({ download: true });

		expect(binaryRequest).toHaveBeenCalledWith(
			'/wiki/download/attachments/9/report%20%233.pdf?version=1&api=v2',
		);
	});

	it('downloads only the retained attachments after truncation, each into its own binary', async () => {
		apiRequest.mockResolvedValue(
			attachmentPage([
				{ id: 'a1', downloadLink: '/download/a1' },
				{ id: 'a2', downloadLink: '/download/a2' },
				{ id: 'a3' },
			]),
		);
		binaryRequest.mockImplementation(async (endpoint) => Buffer.from(endpoint));

		const result = await runGetMany({ download: true, limit: 2 });

		expect(binaryRequest).toHaveBeenCalledTimes(2);
		expect(binaryRequest).toHaveBeenNthCalledWith(1, '/wiki/download/a1');
		expect(binaryRequest).toHaveBeenNthCalledWith(2, '/wiki/download/a2');
		expect(result).toHaveLength(2);
		expect(result[0].binary?.data.data).toBe(Buffer.from('/wiki/download/a1').toString('base64'));
		expect(result[1].binary?.data.data).toBe(Buffer.from('/wiki/download/a2').toString('base64'));
	});

	it('keeps decrementing the page limit while following cursors under a finite limit', async () => {
		const fullPage = Array.from({ length: 250 }, (_, i) => ({ id: `r${i}` }));
		apiRequest
			.mockResolvedValueOnce(attachmentPage(fullPage, `${ENDPOINT}?cursor=c1`))
			.mockResolvedValueOnce(
				attachmentPage(Array.from({ length: 50 }, (_, i) => ({ id: `s${i}` }))),
			);

		const result = await runGetMany({ limit: 300 });

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'GET', ENDPOINT, {}, { limit: 50, cursor: 'c1' });
		expect(result).toHaveLength(300);
	});

	it('puts the file in a custom binary field', async () => {
		apiRequest.mockResolvedValue(
			attachmentPage([{ id: 'a1', downloadLink: '/download/attachments/9/a' }]),
		);

		const result = await runGetMany({ download: true, binaryPropertyName: 'file' });

		expect(result[0].binary).toHaveProperty('file');
		expect(result[0].binary).not.toHaveProperty('data');
	});

	it('throws when an attachment has no usable download link', async () => {
		apiRequest.mockResolvedValue(attachmentPage([{ id: 'a1', title: 'notes.txt' }]));

		const promise = runGetMany({ download: true });

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('"notes.txt" has no usable download link');
		expect(binaryRequest).not.toHaveBeenCalled();
	});

	it('rejects a download link that is not server-relative', async () => {
		apiRequest.mockResolvedValue(
			attachmentPage([
				{ id: 'a1', title: 'notes.txt', downloadLink: 'https://elsewhere.example/f.txt' },
			]),
		);

		const promise = runGetMany({ download: true });

		await expect(promise).rejects.toThrow('"notes.txt" has no usable download link');
		expect(binaryRequest).not.toHaveBeenCalled();
	});
});
