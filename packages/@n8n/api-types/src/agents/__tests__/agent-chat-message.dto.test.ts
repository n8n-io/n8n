import { MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE } from '../agent-chat-attachments.constants';
import { AgentChatMessageDto } from '../dto';

describe('AgentChatMessageDto', () => {
	const attachment = {
		fileName: 'photo.png',
		mimeType: 'image/png',
		data: Buffer.from([1, 2, 3]).toString('base64'),
	};

	it('accepts a message with attachments', () => {
		const result = AgentChatMessageDto.safeParse({
			message: 'look',
			attachments: [attachment],
		});
		expect(result.success).toBe(true);
	});

	it('accepts an attachment-only payload with empty message text', () => {
		// The text-or-attachment invariant is enforced by the controller, not the DTO.
		const result = AgentChatMessageDto.safeParse({ message: '', attachments: [attachment] });
		expect(result.success).toBe(true);
	});

	it('rejects base64 data above the 10 MB cap', () => {
		const result = AgentChatMessageDto.safeParse({
			message: '',
			attachments: [{ ...attachment, data: 'a'.repeat(14_000_001) }],
		});
		expect(result.success).toBe(false);
	});

	it('rejects more attachments than the per-message cap', () => {
		const result = AgentChatMessageDto.safeParse({
			message: '',
			attachments: Array.from(
				{ length: MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE + 1 },
				() => attachment,
			),
		});
		expect(result.success).toBe(false);
	});

	it('rejects attachments with empty fileName or mimeType', () => {
		expect(
			AgentChatMessageDto.safeParse({
				message: '',
				attachments: [{ ...attachment, fileName: '' }],
			}).success,
		).toBe(false);
		expect(
			AgentChatMessageDto.safeParse({
				message: '',
				attachments: [{ ...attachment, mimeType: '' }],
			}).success,
		).toBe(false);
	});
});
