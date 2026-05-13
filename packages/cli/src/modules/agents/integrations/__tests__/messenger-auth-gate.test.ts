import type { User } from '@n8n/db';
import type { Thread } from 'chat';
import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-workflow';

import type { ChatAuthenticationProxyService } from '@/services/chat-authentication-proxy.service';
import type { UrlService } from '@/services/url.service';

import { MessengerAuthGate } from '../messenger-auth-gate';

describe('MessengerAuthGate', () => {
	const chatAuth = mock<ChatAuthenticationProxyService>();
	const urlService = mock<UrlService>();
	const logger = mock<Logger>();
	const fakeUser = mock<User>();

	let gate: MessengerAuthGate;
	let thread: ReturnType<typeof makeThread>;

	function makeThread() {
		return {
			id: 'thread-1',
			post: jest.fn().mockResolvedValue(undefined),
		} as unknown as Thread<unknown, unknown> & { post: jest.Mock };
	}

	beforeEach(() => {
		jest.clearAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
		gate = new MessengerAuthGate('telegram', chatAuth, urlService, logger);
		thread = makeThread();
	});

	it('returns true and does not post when the user is already linked', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(fakeUser);

		const result = await gate.check('987654321', thread);

		expect(result).toBe(true);
		expect(thread.post).not.toHaveBeenCalled();
		expect(chatAuth.createVerificationCode).not.toHaveBeenCalled();
	});

	it('returns false and posts a markdown linking message when the user is unlinked', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(null);
		chatAuth.createVerificationCode.mockResolvedValue('123456789');

		const result = await gate.check('987654321', thread);

		expect(result).toBe(false);
		expect(thread.post).toHaveBeenCalledTimes(1);
		const [arg] = thread.post.mock.calls[0];
		expect(arg).toHaveProperty('markdown');
		expect(arg.markdown).toContain('123456789');
		expect(arg.markdown).toContain('https://n8n.example.com/settings/personal');
	});

	it('returns false and logs when getUserByChatUserId throws (e.g. no provider configured)', async () => {
		chatAuth.getUserByChatUserId.mockRejectedValueOnce(
			new Error('No chat authentication module available'),
		);

		const result = await gate.check('987654321', thread);

		expect(result).toBe(false);
		expect(thread.post).not.toHaveBeenCalled();
		expect(chatAuth.createVerificationCode).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith(
			'[MessengerAuthGate] Failed to check link',
			expect.objectContaining({ platform: 'telegram', platformUserId: '987654321' }),
		);
	});

	it('handles the linked-between-check-and-create race by returning true after re-check', async () => {
		// First check: not linked. createVerificationCode then throws (already linked).
		// Re-check: now linked. Gate should return true and not post.
		chatAuth.getUserByChatUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(fakeUser);
		chatAuth.createVerificationCode.mockRejectedValueOnce(
			new Error('Chat userid is already linked'),
		);

		const result = await gate.check('987654321', thread);

		expect(result).toBe(true);
		expect(thread.post).not.toHaveBeenCalled();
	});

	it('returns false and logs when createVerificationCode fails for any other reason', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(null);
		chatAuth.createVerificationCode.mockRejectedValueOnce(new Error('DB unreachable'));

		const result = await gate.check('987654321', thread);

		expect(result).toBe(false);
		expect(logger.error).toHaveBeenCalledWith(
			'[MessengerAuthGate] Failed to create verification code',
			expect.objectContaining({ platform: 'telegram', platformUserId: '987654321' }),
		);
	});

	it('returns false and logs when thread.post throws', async () => {
		chatAuth.getUserByChatUserId.mockResolvedValue(null);
		chatAuth.createVerificationCode.mockResolvedValue('123456789');
		thread.post.mockRejectedValueOnce(new Error('network down'));

		const result = await gate.check('987654321', thread);

		expect(result).toBe(false);
		expect(logger.error).toHaveBeenCalledWith(
			'[MessengerAuthGate] Failed to post linking message',
			expect.objectContaining({ platform: 'telegram', platformUserId: '987654321' }),
		);
	});
});
