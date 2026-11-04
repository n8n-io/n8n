import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import {
	ASSISTANT_CREDITS_METADATA_KEY,
	AssistantThreadCreditsService,
} from '../assistant-thread-credits.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

const THREAD_ID = 'thread-1';

describe('AssistantThreadCreditsService', () => {
	const threadMetadata = mock<SystemAgentThreadMetadataService>();
	const service = new AssistantThreadCreditsService(threadMetadata);
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTotal', () => {
		it('reads the credits key of the Assistant agent thread for the user', async () => {
			threadMetadata.read.mockResolvedValue(2.5);

			await expect(service.getTotal(user, THREAD_ID)).resolves.toBe(2.5);
			expect(threadMetadata.read).toHaveBeenCalledWith(
				ASSISTANT_AGENT_ID,
				user,
				THREAD_ID,
				ASSISTANT_CREDITS_METADATA_KEY,
			);
		});

		it.each([undefined, 'x', Number.NaN])('returns undefined for a stored %s', async (stored) => {
			threadMetadata.read.mockResolvedValue(stored);

			await expect(service.getTotal(user, THREAD_ID)).resolves.toBeUndefined();
		});
	});

	describe('addCredits', () => {
		/** Runs the change on a stored value, as the locked row does. */
		function storeWith(current: unknown) {
			threadMetadata.update.mockImplementation(async (_agentId, _user, _threadId, _key, change) => {
				change(current);
			});
		}

		it('adds the claim to the stored total', async () => {
			storeWith(2.5);

			await expect(service.addCredits(user, THREAD_ID, 1.25)).resolves.toBe(3.75);
			expect(threadMetadata.update).toHaveBeenCalledWith(
				ASSISTANT_AGENT_ID,
				user,
				THREAD_ID,
				ASSISTANT_CREDITS_METADATA_KEY,
				expect.any(Function),
			);
		});

		it('starts from zero when no valid total is stored', async () => {
			storeWith('x');

			await expect(service.addCredits(user, THREAD_ID, 1.25)).resolves.toBe(1.25);
		});

		it('returns undefined when the thread has no memory row yet', async () => {
			threadMetadata.update.mockResolvedValue(undefined);

			await expect(service.addCredits(user, THREAD_ID, 1)).resolves.toBeUndefined();
		});

		it('returns undefined when the user has no Assistant agent thread with the id', async () => {
			threadMetadata.update.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(service.addCredits(user, THREAD_ID, 1)).resolves.toBeUndefined();
		});

		it('rethrows other failures', async () => {
			threadMetadata.update.mockRejectedValue(new Error('db down'));

			await expect(service.addCredits(user, THREAD_ID, 1)).rejects.toThrow('db down');
		});
	});
});
