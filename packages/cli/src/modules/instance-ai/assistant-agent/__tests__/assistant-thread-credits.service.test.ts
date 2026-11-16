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

	it('reads the credit total of the thread', async () => {
		threadMetadata.read.mockResolvedValueOnce(2.5).mockResolvedValueOnce(undefined);

		await expect(service.getTotal(user, THREAD_ID)).resolves.toBe(2.5);
		await expect(service.getTotal(user, THREAD_ID)).resolves.toBeUndefined();
		expect(threadMetadata.read).toHaveBeenCalledWith(
			ASSISTANT_AGENT_ID,
			user,
			THREAD_ID,
			ASSISTANT_CREDITS_METADATA_KEY,
		);
	});

	it('adds a claim to the stored total and returns the new total', async () => {
		threadMetadata.update.mockImplementation(async (_agentId, _user, _threadId, _key, change) => {
			change(2.5);
		});

		await expect(service.addCredits(user, THREAD_ID, 1.25)).resolves.toBe(3.75);
	});

	it('returns undefined when the user has no Assistant agent thread with the id', async () => {
		threadMetadata.update.mockRejectedValue(new NotFoundError('Session not found'));

		await expect(service.addCredits(user, THREAD_ID, 1)).resolves.toBeUndefined();
	});
});
