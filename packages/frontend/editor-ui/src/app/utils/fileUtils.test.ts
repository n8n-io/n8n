import { convertFileToBinaryData, getBinaryDataFileName } from '@/app/utils/fileUtils';

describe('getBinaryDataFileName', () => {
	it('keeps a name that already carries the extension', () => {
		expect(getBinaryDataFileName({ fileName: 'report.pdf', fileExtension: 'pdf' })).toBe(
			'report.pdf',
		);
	});

	it('appends the extension when the name has none', () => {
		expect(getBinaryDataFileName({ fileName: 'report', fileExtension: 'pdf' })).toBe('report.pdf');
	});

	it('leaves the name alone when there is no extension', () => {
		expect(getBinaryDataFileName({ fileName: 'README' })).toBe('README');
	});

	it('falls back to "file" without a name', () => {
		expect(getBinaryDataFileName({ fileExtension: 'pdf' })).toBe('file.pdf');
		expect(getBinaryDataFileName({})).toBe('file');
	});
});

describe('convertFileToBinaryData', () => {
	test.each([
		['report.pdf', 'application/pdf', 'pdf', 'pdf'],
		['README', 'text/plain', undefined, 'text'],
		['.env', 'text/plain', undefined, 'text'],
		['README', '', undefined, undefined],
		['archive.tar.gz', 'application/gzip', 'gz', undefined],
		['data.json', 'application/json', 'json', 'json'],
		['page.html', 'text/html', 'html', 'html'],
		['trailing.', 'text/plain', undefined, 'text'],
	])(
		'derives %j (%j) as fileExtension %j and fileType %j',
		async (fileName, mimeType, fileExtension, fileType) => {
			const file = new File(['hello'], fileName, { type: mimeType });

			const binaryData = await convertFileToBinaryData(file);

			expect(binaryData.fileExtension).toBe(fileExtension);
			expect(binaryData.fileType).toBe(fileType);
		},
	);

	it('carries over the file name, size, mime type and base64 data', async () => {
		const file = new File(['hello'], 'report.pdf', { type: 'application/pdf' });

		expect(await convertFileToBinaryData(file)).toEqual({
			data: btoa('hello'),
			mimeType: 'application/pdf',
			fileName: 'report.pdf',
			fileSize: '5 bytes',
			fileExtension: 'pdf',
			fileType: 'pdf',
		});
	});

	it('rejects when the file cannot be read', async () => {
		vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
			this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
		});

		await expect(convertFileToBinaryData(new File([], 'README'))).rejects.toThrow(
			'Failed to convert file to binary data',
		);
	});
});
