import { buildFileUploadGuidance } from '../integration-tool-descriptions';

describe('buildFileUploadGuidance', () => {
	const limits = { maxFiles: 10, maxFileBytes: 50 * 1024 * 1024 };

	it('names the caption limit of the platform', () => {
		const guidance = buildFileUploadGuidance({ ...limits, maxCaptionLength: 1024 }, false);

		expect(guidance).toContain(
			'Text longer than 1024 characters goes as its own message before the files.',
		);
	});

	it('names no caption limit when the platform has none', () => {
		const guidance = buildFileUploadGuidance(limits, false);

		expect(guidance).not.toContain('Text longer than');
		expect(guidance).toContain('Send up to 30 files of up to 50 MB each with one action.');
	});

	it('says that the queued files follow a streamed reply as their own message', () => {
		const guidance = buildFileUploadGuidance(limits, true);

		expect(guidance).toContain('the files are posted after your final reply as their own message.');
		expect(guidance).toContain('For the other sends, the text goes with the first.');
		expect(guidance).not.toContain('your reply text is their message');
	});
});
