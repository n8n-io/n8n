import { isAllowedAgentFile } from '../agent-upload.middleware';

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
