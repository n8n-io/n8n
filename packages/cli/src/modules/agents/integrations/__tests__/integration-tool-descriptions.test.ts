import { buildFileUploadGuidance } from '../integration-tool-descriptions';

describe('buildFileUploadGuidance', () => {
	const limits = { maxFiles: 10, maxFileBytes: 50 * 1024 * 1024 };

	it('names the caption limit of the platform', () => {
		const guidance = buildFileUploadGuidance({ ...limits, maxCaptionLength: 1024 });

		expect(guidance).toContain(
			'Text longer than 1024 characters goes as its own message before the files.',
		);
	});

	it('names no caption limit when the platform has none', () => {
		const guidance = buildFileUploadGuidance(limits);

		expect(guidance).not.toContain('Text longer than');
		expect(guidance).toContain('Send up to 30 files of up to 50 MB each with one action.');
	});
});
