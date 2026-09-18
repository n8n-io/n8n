import { mock } from 'vitest-mock-extended';

import type { AgentConversationLeaseService } from '../agent-conversation-lease.service';

// Persistence and async context are exercised against real leases in the integration suite.
export function mockConversationLeases() {
	const leases = mock<AgentConversationLeaseService>();
	const controller = new AbortController();
	leases.isHeld.mockResolvedValue(false);
	leases.requireOwner.mockImplementation((threadId) => ({
		lease: { threadId, agentId: 'agent-1', ownerToken: 'owner-1' },
		signal: controller.signal,
		lose: (error) => controller.abort(error),
	}));
	leases.withLease.mockImplementation(
		async (_agentId, _threadId, run, options) =>
			await run(
				options?.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
			),
	);
	leases.stream.mockImplementation(async function* (_agentId, threadId, create, options) {
		if (typeof threadId === 'function') await threadId();
		yield* create(
			options?.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
		);
	});
	leases.write.mockImplementation(async (_owner, write) => await write({}));
	leases.outsideConversation.mockImplementation((run) => run());
	return leases;
}
