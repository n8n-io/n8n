import {
	buildActionToolDescription,
	buildChannelToolInstruction,
	buildFileUploadGuidance,
} from '../integration-tool-descriptions';
import { getIntegrationToolConnectionDescriptors } from '../integration-tool-factory';

describe('buildActionToolDescription', () => {
	it('includes card examples and destination guidance in channel actions', () => {
		const [descriptor] = getIntegrationToolConnectionDescriptors(
			[{ type: 'slack', credentialId: 'cred-1' }],
			'agent-1',
			() => ({ supportedComponents: ['section', 'button', 'select', 'radio_select'] }),
		);
		const description = buildActionToolDescription(descriptor);
		expect(description).toContain('Call respond only with message.card');
		expect(description).toContain('Generic card examples:');
		expect(description).toContain(
			'send_channel_message with input.channelId and input.message.card',
		);
		expect(description).not.toContain('render_ui');
	});

	it.each([undefined, []])(
		'omits card guidance for Linear with components=%s',
		(supportedComponents) => {
			const [descriptor] = getIntegrationToolConnectionDescriptors(
				[{ type: 'linear', credentialId: 'cred-1' }],
				'agent-1',
				() => ({ supportedComponents }),
			);
			const description = buildActionToolDescription(descriptor);
			expect(description).toContain('Do not send rich cards.');
			expect(description).toContain(
				'your final reply text is posted to that conversation automatically',
			);
			expect(description).not.toContain('message.card');
			expect(description).not.toContain('Generic card examples:');
			expect(description).not.toContain('For button components');
			expect(description).not.toContain('For radio-style choices');
		},
	);
});

describe('buildChannelToolInstruction', () => {
	it('names the connection tools and declared card components', () => {
		const descriptors = getIntegrationToolConnectionDescriptors(
			[
				{ type: 'slack', credentialId: 'cred-1' },
				{ type: 'slack', credentialId: 'cred-2' },
			],
			'agent-1',
			() => ({ supportedComponents: ['section', 'button', 'select'] }),
		);
		const instruction = buildChannelToolInstruction(descriptors[1]);
		expect(instruction).toContain('slack_2_context and slack_2_action');
		expect(instruction).toContain('Search your tools');
		expect(instruction).toContain('section, button, select');
		expect(instruction).toContain('supported destinations');
	});

	it('does not claim card support without declared components', () => {
		const [descriptor] = getIntegrationToolConnectionDescriptors([
			{ type: 'linear', credentialId: 'cred-1' },
		]);
		expect(buildChannelToolInstruction(descriptor)).not.toContain('rich messages');
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
