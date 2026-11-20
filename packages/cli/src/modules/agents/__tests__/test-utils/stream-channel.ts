import { mock } from 'vitest-mock-extended';

import type { AgentStreamChannel } from '../../queue/agent-stream-channel.service';

/**
 * An in-memory `AgentStreamChannel` for the key and control channels. A main
 * and a worker in one test share it, as they share Redis. Messages arrive
 * after a microtask, as they arrive later over Redis.
 */
export function fakeStreamChannel() {
	const keys = new Map<string, (message: string) => void>();
	const cancelHandlers: ((turnId: string) => void)[] = [];
	const published: { key: string; message: string }[] = [];

	const channel = mock<AgentStreamChannel>({
		listen: async (key, handler) => {
			keys.set(key, handler);
			return async () => {
				keys.delete(key);
			};
		},
		publishTo: async (key, message) => {
			published.push({ key, message });
			await Promise.resolve();
			keys.get(key)?.(message);
		},
		onCancel: async (handler) => {
			cancelHandlers.push(handler);
		},
		cancel: async (turnId) => {
			await Promise.resolve();
			for (const handler of cancelHandlers) handler(turnId);
		},
	});

	return {
		channel,
		published,
		/** Keys that a main reads now. */
		listening: () => [...keys.keys()],
	};
}
