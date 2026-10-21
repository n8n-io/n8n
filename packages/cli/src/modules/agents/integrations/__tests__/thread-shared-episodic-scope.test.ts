import type { EpisodicScopeContext } from '../agent-chat-integration';
import { resolveThreadSharedEpisodicScope } from '../thread-shared-episodic-scope';

const context = (participated: string[]): EpisodicScopeContext => ({
	agentId: 'agent-1',
	credentialId: 'credential-1',
	integrationType: 'slack',
	threadId: 'thread-1',
	resourceId: 'integration:slack:U1',
	author: { id: 'U1', name: 'Alice' },
	loadParticipatedThreadIds: async () => participated,
});

describe('resolveThreadSharedEpisodicScope', () => {
	it('writes to the thread and recalls the author scope, the thread and participated threads', async () => {
		await expect(
			resolveThreadSharedEpisodicScope(context(['thread-1', 'thread-old'])),
		).resolves.toEqual({
			writeScopeId: 'thread:thread-1',
			readScopeIds: ['integration:slack:U1', 'thread:thread-1', 'thread:thread-old'],
		});
	});

	it('bounds the participated-thread lookup', async () => {
		const loadParticipatedThreadIds = vi.fn().mockResolvedValue([]);

		await resolveThreadSharedEpisodicScope({ ...context([]), loadParticipatedThreadIds });

		expect(loadParticipatedThreadIds).toHaveBeenCalledWith(200);
	});
});
