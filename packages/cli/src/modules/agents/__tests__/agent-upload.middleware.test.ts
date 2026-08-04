import { MAX_AGENT_FILES_PER_UPLOAD } from '@n8n/api-types';
import multer from 'multer';

import { describeMulterError, isAllowedAgentFile } from '../agent-upload.middleware';

describe('AgentUploadMiddleware', () => {
	it.each(['data.csv', 'notes.md', 'notes.markdown', 'document.pdf', 'plain.txt'])(
		'allows %s',
		(originalname) => {
			expect(isAllowedAgentFile({ originalname })).toBe(true);
		},
	);

	it.each(['archive.zip', 'image.png', 'script.js', 'document.pdf.exe', 'README'])(
		'rejects %s',
		(originalname) => {
			expect(isAllowedAgentFile({ originalname })).toBe(false);
		},
	);
});

describe('describeMulterError', () => {
	it('explains the per-upload file count limit instead of surfacing "Unexpected field"', () => {
		const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files');

		expect(describeMulterError(error)).toBe(
			`You can upload at most ${MAX_AGENT_FILES_PER_UPLOAD} files at a time`,
		);
	});

	it('explains the file size limit', () => {
		const error = new multer.MulterError('LIMIT_FILE_SIZE', 'files');

		expect(describeMulterError(error)).toBe('Files must be 50 MB or smaller');
	});

	it('falls back to the multer message for other error codes', () => {
		const error = new multer.MulterError('LIMIT_FILE_COUNT', 'files');

		expect(describeMulterError(error)).toBe(error.message);
	});
});
