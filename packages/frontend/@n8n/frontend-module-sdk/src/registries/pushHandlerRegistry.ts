import type { PushType } from '@n8n/api-types';

import type { ModulePushHandler, ModulePushHandlers } from '../types/push';

// One handler per push message type. The shell consults this before its own
// switch, so a module can own (or override) a push message type.
const handlers = new Map<PushType, ModulePushHandler>();

export function register(type: PushType, handler: ModulePushHandler): void {
	if (handlers.has(type)) {
		console.warn(`Push handler for type "${type}" is already registered. Skipping.`);
		return;
	}
	handlers.set(type, handler);
}

/**
 * Register every handler in a module's `pushHandlers` map. Centralises the one
 * cast needed to erase the per-type event narrowing: each handler is stored
 * against its own key, so it only ever receives an event of that type.
 */
export function registerAll(pushHandlers: ModulePushHandlers): void {
	for (const type of Object.keys(pushHandlers) as PushType[]) {
		const handler = pushHandlers[type];
		if (handler) {
			register(type, handler as ModulePushHandler);
		}
	}
}

export function get(type: PushType): ModulePushHandler | undefined {
	return handlers.get(type);
}

export function has(type: PushType): boolean {
	return handlers.has(type);
}

export function getTypes(): PushType[] {
	return Array.from(handlers.keys());
}

export function unregister(type: PushType): void {
	handlers.delete(type);
}

/**
 * Remove all registered handlers. Primarily for test isolation.
 */
export function clear(): void {
	handlers.clear();
}
