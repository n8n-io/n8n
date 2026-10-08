import { AGENT_CHAT_ATTACHMENT_ACCEPT } from '../agent-chat-attachments.constants';

describe('AGENT_CHAT_ATTACHMENT_ACCEPT', () => {
	it('includes Session Files and office types plus images and PDF', () => {
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('text/csv');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('.csv');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('application/vnd.ms-excel');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('text/plain');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('text/markdown');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('application/json');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain(
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain(
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		);
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('application/pdf');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).toContain('image/*');
	});

	it('does not include zip, video, or a catch-all', () => {
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).not.toContain('application/zip');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).not.toContain('video/*');
		expect(AGENT_CHAT_ATTACHMENT_ACCEPT).not.toContain('*/*');
	});
});
