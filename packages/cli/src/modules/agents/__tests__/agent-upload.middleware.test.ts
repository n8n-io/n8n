import {
	isAllowedAgentFile,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
} from '../agent-upload.middleware';

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

	it('limits uploads to 50 MB', () => {
		expect(MAX_AGENT_FILE_SIZE_MB).toBe(50);
		expect(MAX_AGENT_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
	});

	it('limits upload requests to 10 files', () => {
		expect(MAX_AGENT_FILES_PER_UPLOAD).toBe(10);
	});
});
