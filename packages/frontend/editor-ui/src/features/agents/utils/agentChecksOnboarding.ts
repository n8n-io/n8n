/**
 * Shared, per-agent guard for the first-check card's one-off work. The card can
 * remount while the assistant thread updates, and a second mount must join the
 * work already in flight rather than prepare a second batch of checks.
 */
const inFlight = new Map<string, Promise<void>>();

export async function runOncePerAgent(agentId: string, work: () => Promise<void>): Promise<void> {
	const running = inFlight.get(agentId);
	if (running) return await running;
	const promise = work().finally(() => inFlight.delete(agentId));
	inFlight.set(agentId, promise);
	return await promise;
}
