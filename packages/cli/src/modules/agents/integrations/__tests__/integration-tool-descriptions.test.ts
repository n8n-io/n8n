import {
	buildActionToolDescription,
	buildFileUploadGuidance,
} from '../integration-tool-descriptions';
import { getIntegrationToolConnectionDescriptors } from '../integration-tool-factory';

describe('buildActionToolDescription', () => {
	it.each([false, true])('routes card requests with render_ui=%s', (renderUi) => {
		const [descriptor] = getIntegrationToolConnectionDescriptors(
			[{ type: 'slack', credentialId: 'cred-1' }],
			'agent-1',
			() => ({ conversationTools: renderUi ? ['render_ui'] : [] }),
		);
		const description = buildActionToolDescription(descriptor);
		if (renderUi) {
			expect(description).toContain('Your reply text is posted automatically.');
			expect(description).toContain('Use render_ui to show a card in the current conversation.');
			expect(description).toContain(
				'Use respond for files or after switching to a different target.',
			);
			expect(description).not.toContain('Call respond only with message.card');
			expect(description).not.toContain('Generic card examples:');
		} else {
			expect(description).toContain('Call respond only with message.card');
			expect(description).toContain('Generic card examples:');
		}
	});
});

describe('buildFileUploadGuidance', () => {
	const limits = { maxFiles: 10, maxFileBytes: 50 * 1024 * 1024 };
	const maxStored = 100 * 1024 * 1024;

	it('names the caption limit of the platform', () => {
		const guidance = buildFileUploadGuidance(
			{ ...limits, maxCaptionLength: 1024 },
			false,
			maxStored,
		);

		expect(guidance).toContain(
			'Text longer than 1024 characters goes as its own message before the files.',
		);
	});

	it('names no caption limit when the platform has none', () => {
		const guidance = buildFileUploadGuidance(limits, false, maxStored);

		expect(guidance).not.toContain('Text longer than');
		expect(guidance).toContain('Send up to 30 files of up to 50 MB each with one action.');
	});

	it('says that the queued files follow a streamed reply as their own message', () => {
		const guidance = buildFileUploadGuidance(limits, true, maxStored);

		expect(guidance).toContain('the files are posted after your final reply as their own message.');
		expect(guidance).toContain('For the other sends, the text goes with the first.');
		expect(guidance).not.toContain('your reply text is their message');
	});

	it('names the stored file cap when it is smaller than the platform limit', () => {
		const guidance = buildFileUploadGuidance(
			{ maxFiles: 10, maxFileBytes: 1024 * 1024 * 1024 },
			false,
			maxStored,
		);

		expect(guidance).toContain('files of up to 100 MB each');
	});
});
