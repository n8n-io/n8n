import type { Logger } from '@n8n/backend-common';
import type { AgentDbMessage, MessageContent } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import {
	ATTACHMENT_REMOVED_NOTE,
	dropRejectedAttachmentsFromHistory,
	stripFileAttachmentParts,
} from '../drop-rejected-attachments';

function userMessage(id: string, content: MessageContent[]): AgentDbMessage {
	return { id, createdAt: new Date('2026-07-17T00:40:00Z'), role: 'user', content };
}

/** Narrows away the custom-message branch of the union so assertions can read content. */
function contentOf(message: AgentDbMessage): MessageContent[] {
	if (!('content' in message)) throw new Error('expected an LLM message with content');
	return message.content;
}

const textPart = { type: 'text' as const, text: 'make sure the reels are the latest' };
const filePart = { type: 'file' as const, mediaType: 'image/png', data: 'AAAA' };

describe('stripFileAttachmentParts', () => {
	it('drops file parts and leaves a note in their place', () => {
		const changed = stripFileAttachmentParts([userMessage('m1', [textPart, filePart])]);

		expect(changed).toHaveLength(1);
		expect(contentOf(changed[0])).toEqual([
			textPart,
			{ type: 'text', text: ATTACHMENT_REMOVED_NOTE },
		]);
	});

	it('preserves the text the user actually typed', () => {
		const changed = stripFileAttachmentParts([userMessage('m1', [filePart, textPart])]);

		expect(contentOf(changed[0])).toContainEqual(textPart);
	});

	it('returns only the messages it changed', () => {
		const changed = stripFileAttachmentParts([
			userMessage('untouched', [textPart]),
			userMessage('poisoned', [filePart]),
		]);

		expect(changed.map((m) => m.id)).toEqual(['poisoned']);
	});

	it('never leaves a message with empty content', () => {
		const changed = stripFileAttachmentParts([userMessage('only-file', [filePart])]);

		expect(contentOf(changed[0])).toEqual([{ type: 'text', text: ATTACHMENT_REMOVED_NOTE }]);
	});

	it('strips every file part when a message carries several', () => {
		const changed = stripFileAttachmentParts([
			userMessage('m1', [filePart, textPart, { ...filePart, data: 'BBBB' }]),
		]);

		expect(contentOf(changed[0])).toEqual([
			textPart,
			{ type: 'text', text: ATTACHMENT_REMOVED_NOTE },
		]);
	});

	it('leaves messages without a content array untouched', () => {
		const custom = {
			id: 'c1',
			createdAt: new Date(),
			type: 'custom',
			data: {},
		} as unknown as AgentDbMessage;

		expect(stripFileAttachmentParts([custom])).toEqual([]);
	});
});

describe('dropRejectedAttachmentsFromHistory', () => {
	const logger = mock<Logger>();

	it('persists the sanitized messages so later turns stop replaying the attachment', async () => {
		const memory = {
			getMessages: vi.fn().mockResolvedValue([userMessage('m1', [textPart, filePart])]),
			saveMessages: vi.fn().mockResolvedValue(undefined),
		};

		const outcome = await dropRejectedAttachmentsFromHistory(
			memory,
			{ threadId: 't1', resourceId: 'u1' },
			logger,
		);

		expect(outcome).toBe('removed');
		expect(memory.saveMessages).toHaveBeenCalledWith({
			threadId: 't1',
			resourceId: 'u1',
			messages: [
				expect.objectContaining({
					id: 'm1',
					content: [textPart, { type: 'text', text: ATTACHMENT_REMOVED_NOTE }],
				}),
			],
		});
	});

	it('does not write when the thread holds no file parts', async () => {
		const memory = {
			getMessages: vi.fn().mockResolvedValue([userMessage('m1', [textPart])]),
			saveMessages: vi.fn().mockResolvedValue(undefined),
		};

		const outcome = await dropRejectedAttachmentsFromHistory(
			memory,
			{ threadId: 't1', resourceId: 'u1' },
			logger,
		);

		// Distinct from a failed write: nothing was there to remove, so callers must not
		// tell the user their attachment could not be removed.
		expect(outcome).toBe('no-attachments');
		expect(memory.saveMessages).not.toHaveBeenCalled();
	});

	it('never lets a recovery failure mask the original run error', async () => {
		const memory = {
			getMessages: vi.fn().mockRejectedValue(new Error('db down')),
			saveMessages: vi.fn().mockResolvedValue(undefined),
		};

		await expect(
			dropRejectedAttachmentsFromHistory(memory, { threadId: 't1', resourceId: 'u1' }, logger),
		).resolves.toBe('failed');
	});
});

describe('dropRejectedAttachmentsFromHistory outcomes', () => {
	const logger = mock<Logger>();

	// The three outcomes drive different user-facing copy, so they must not collapse:
	// "nothing to remove" is silence, "failed" tells the user to start a new chat.
	it('separates a failed write from having nothing to remove', async () => {
		const failing = {
			getMessages: vi.fn().mockResolvedValue([userMessage('m1', [textPart, filePart])]),
			saveMessages: vi.fn().mockRejectedValue(new Error('db down')),
		};

		await expect(
			dropRejectedAttachmentsFromHistory(failing, { threadId: 't1', resourceId: 'u1' }, logger),
		).resolves.toBe('failed');
	});
});
