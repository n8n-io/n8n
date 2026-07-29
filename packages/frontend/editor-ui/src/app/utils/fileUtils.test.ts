import { convertFileToBinaryData } from './fileUtils';

describe('fileUtils', () => {
	describe('convertFileToBinaryData', () => {
		it('should convert a file with an extension', async () => {
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

		it('should use the last extension for a file name with multiple dots', async () => {
			const file = new File(['hello'], 'archive.tar.gz', { type: 'application/gzip' });

			const binaryData = await convertFileToBinaryData(file);

			expect(binaryData.fileExtension).toBe('gz');
		});

		it('should not set a file extension for a file name without an extension', async () => {
			const file = new File(['hello'], 'README', { type: 'text/plain' });

			const binaryData = await convertFileToBinaryData(file);

			expect(binaryData.fileExtension).toBeUndefined();
			expect(binaryData.fileName).toBe('README');
			expect(binaryData.fileType).toBe('text');
		});

		it('should not set a file extension for a dotfile', async () => {
			const file = new File(['hello'], '.env', { type: 'text/plain' });

			const binaryData = await convertFileToBinaryData(file);

			expect(binaryData.fileExtension).toBeUndefined();
			expect(binaryData.fileName).toBe('.env');
		});

		it('should not set a file type when the mime type is missing', async () => {
			const file = new File(['hello'], 'README', { type: '' });

			const binaryData = await convertFileToBinaryData(file);

			expect(binaryData.fileType).toBeUndefined();
		});
	});
});
