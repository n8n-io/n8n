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
		const result = AgentChatMessageDto.safeParse({ message: '', attachments: [attachment] });
		expect(result.success).toBe(true);
	});

	it('requires a session when a valid client message UUID is supplied', () => {
		const messageId = 'C4B02D7B-2088-41CE-9C6B-FAF8C7B83D8A';
		const payload = { message: 'Hello', sessionId: 'session-1', messageId };
		expect(AgentChatMessageDto.parse(payload)).toEqual(payload);
		expect(new AgentChatMessageDto(payload)).toMatchObject(payload);
		for (const invalid of [
			{ ...payload, sessionId: undefined },
			{ ...payload, sessionId: '' },
			{ ...payload, messageId: 'invalid' },
			{ ...payload, messageId: '' },
		]) {
			expect(AgentChatMessageDto.safeParse(invalid).success).toBe(false);
			expect(() => AgentChatMessageDto.parse(invalid)).toThrow();
		}
	});

	it('rejects a payload with neither message text nor attachments', () => {
		expect(AgentChatMessageDto.safeParse({ message: '' }).success).toBe(false);
		expect(AgentChatMessageDto.safeParse({ message: '   ' }).success).toBe(false);
		expect(AgentChatMessageDto.safeParse({ message: '   ', attachments: [] }).success).toBe(false);
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
