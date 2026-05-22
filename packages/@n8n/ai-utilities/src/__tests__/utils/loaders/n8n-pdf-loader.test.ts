import { N8nPdfLoader } from 'src/utils/loaders/n8n-pdf-loader';

const mockGetText = jest.fn();
const mockGetInfo = jest.fn();
const mockDestroy = jest.fn();
const mockConstructor = jest.fn();

jest.mock('pdf-parse', () => ({
	__esModule: true,
	PDFParse: jest.fn().mockImplementation((options: unknown) => {
		mockConstructor(options);
		return {
			getText: mockGetText,
			getInfo: mockGetInfo,
			destroy: mockDestroy,
		};
	}),
}));

function makeBlob(content = 'fake-pdf-bytes'): Blob {
	return new Blob([Buffer.from(content)], { type: 'application/pdf' });
}

describe('N8nPdfLoader', () => {
	beforeEach(() => {
		mockGetText.mockReset();
		mockGetInfo.mockReset().mockResolvedValue({ info: undefined, metadata: undefined });
		mockDestroy.mockReset().mockResolvedValue(undefined);
		mockConstructor.mockReset();
	});

	it('produces one Document per page with loc.pageNumber and pdf.totalPages when splitPages is true', async () => {
		mockGetText.mockResolvedValue({
			pages: [
				{ num: 1, text: 'Page one body' },
				{ num: 2, text: 'Page two body' },
				{ num: 3, text: 'Page three body' },
			],
			text: 'Page one bodyPage two bodyPage three body',
			total: 3,
		});
		mockGetInfo.mockResolvedValue({
			info: { Title: 'Sample', Author: 'Test' },
			metadata: { fake: 'xmp' },
		});

		const loader = new N8nPdfLoader(makeBlob(), { splitPages: true });
		const docs = await loader.load();

		expect(docs).toHaveLength(3);
		expect(docs[0].pageContent).toBe('Page one body');
		expect(docs[1].pageContent).toBe('Page two body');
		expect(docs[2].pageContent).toBe('Page three body');
		expect(docs[0].metadata).toMatchObject({
			loc: { pageNumber: 1 },
			pdf: {
				info: { Title: 'Sample', Author: 'Test' },
				metadata: { fake: 'xmp' },
				totalPages: 3,
			},
		});
		expect(docs[2].metadata.loc).toEqual({ pageNumber: 3 });
	});

	it('concatenates pages into a single Document when splitPages is false', async () => {
		mockGetText.mockResolvedValue({
			pages: [
				{ num: 1, text: 'first' },
				{ num: 2, text: 'second' },
			],
			text: 'firstsecond',
			total: 2,
		});

		const loader = new N8nPdfLoader(makeBlob(), { splitPages: false });
		const docs = await loader.load();

		expect(docs).toHaveLength(1);
		expect(docs[0].pageContent).toBe('first\n\nsecond');
		expect(docs[0].metadata.pdf).toEqual({
			info: undefined,
			metadata: undefined,
			totalPages: 2,
		});
		// No `loc.pageNumber` on the merged document — matches the
		// behavior of LangChain's PDFLoader when splitPages is false.
		expect(docs[0].metadata.loc).toBeUndefined();
	});

	it('defaults splitPages to true when options are omitted', async () => {
		mockGetText.mockResolvedValue({
			pages: [{ num: 1, text: 'only page' }],
			text: 'only page',
			total: 1,
		});

		const loader = new N8nPdfLoader(makeBlob());
		const docs = await loader.load();

		expect(docs).toHaveLength(1);
		expect(docs[0].metadata.loc).toEqual({ pageNumber: 1 });
	});

	it('returns [] when the PDF has zero pages and splitPages is false', async () => {
		mockGetText.mockResolvedValue({ pages: [], text: '', total: 0 });

		const loader = new N8nPdfLoader(makeBlob(), { splitPages: false });
		const docs = await loader.load();

		expect(docs).toEqual([]);
	});

	it('disables the per-page joiner so extracted text is not polluted with separators', async () => {
		mockGetText.mockResolvedValue({
			pages: [{ num: 1, text: 'clean text' }],
			text: 'clean text',
			total: 1,
		});

		const loader = new N8nPdfLoader(makeBlob());
		await loader.load();

		expect(mockGetText).toHaveBeenCalledWith({ pageJoiner: '' });
	});

	it('passes binary contents to PDFParse as a Uint8Array', async () => {
		mockGetText.mockResolvedValue({
			pages: [{ num: 1, text: 't' }],
			text: 't',
			total: 1,
		});

		const loader = new N8nPdfLoader(makeBlob('hello'));
		await loader.load();

		expect(mockConstructor).toHaveBeenCalledTimes(1);
		const [arg] = mockConstructor.mock.calls[0];
		expect(arg.data).toBeInstanceOf(Uint8Array);
		expect(Buffer.from(arg.data).toString('utf-8')).toBe('hello');
	});

	it('calls destroy() exactly once when extraction succeeds', async () => {
		mockGetText.mockResolvedValue({
			pages: [{ num: 1, text: 'ok' }],
			text: 'ok',
			total: 1,
		});

		const loader = new N8nPdfLoader(makeBlob());
		await loader.load();

		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('calls destroy() even when getText() throws (worker cleanup on error path)', async () => {
		mockGetText.mockRejectedValue(new Error('Invalid PDF structure'));

		const loader = new N8nPdfLoader(makeBlob());

		await expect(loader.load()).rejects.toThrow('Invalid PDF structure');
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('tolerates getInfo() failure and still returns documents with structural metadata', async () => {
		mockGetText.mockResolvedValue({
			pages: [{ num: 1, text: 'page' }],
			text: 'page',
			total: 1,
		});
		mockGetInfo.mockRejectedValue(new Error('info unavailable'));

		const loader = new N8nPdfLoader(makeBlob());
		const docs = await loader.load();

		expect(docs).toHaveLength(1);
		expect(docs[0].metadata.pdf).toEqual({
			info: undefined,
			metadata: undefined,
			totalPages: 1,
		});
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('passes through source metadata from BufferLoader (blob shape)', async () => {
		mockGetText.mockResolvedValue({
			pages: [{ num: 1, text: 'one' }],
			text: 'one',
			total: 1,
		});

		const loader = new N8nPdfLoader(makeBlob());
		const docs = await loader.load();

		// BufferLoader.load() sets metadata.source = 'blob' and metadata.blobType
		// before calling parse(); these must survive the merge.
		expect(docs[0].metadata).toMatchObject({
			source: 'blob',
			blobType: 'application/pdf',
		});
	});
});
