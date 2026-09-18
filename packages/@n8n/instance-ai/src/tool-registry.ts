import type { BuiltTool } from '@n8n/agents';

import type { InstanceAiToolRegistry } from './types';

export function createToolRegistry(
	entries: Iterable<readonly [string, BuiltTool]> = [],
): InstanceAiToolRegistry {
	const registry = new Map<string, BuiltTool>();
	for (const [name, tool] of entries) {
		registry.set(name, tool);
	}
	return registry;
}

export function createToolRegistryFromTools(tools: Iterable<BuiltTool>): InstanceAiToolRegistry {
	const registry = createToolRegistry();
	for (const tool of tools) {
		registry.set(tool.name, tool);
	}
	return registry;
}

export function mergeToolRegistries(
	...registries: Array<InstanceAiToolRegistry | undefined>
): InstanceAiToolRegistry {
	const merged = createToolRegistry();
	for (const registry of registries) {
		if (!registry) continue;
		for (const [name, tool] of registry) {
			merged.set(name, tool);
		}
	}
	return merged;
}

export function filterToolRegistry(
	registry: InstanceAiToolRegistry,
	predicate: (entry: [string, BuiltTool]) => boolean,
): InstanceAiToolRegistry {
	const filtered = createToolRegistry();
	for (const entry of registry) {
		if (predicate(entry)) {
			filtered.set(entry[0], entry[1]);
		}
	}
	return filtered;
}

export function toolRegistryValues(registry: InstanceAiToolRegistry): BuiltTool[] {
	return Array.from(registry.values());
}

export function toolRegistryKeys(registry: InstanceAiToolRegistry): string[] {
	return Array.from(registry.keys());
}

export interface ToolCacheOptions {
	deterministicActions?: Record<string, Set<string>>;
}

const DEFAULT_DETERMINISTIC_ACTIONS: Record<string, Set<string>> = {
	nodes: new Set(['type-definition', 'describe', 'suggested']),
	'n8n-docs': new Set(['read', 'lookup', 'search']),
	credentials: new Set(['search-types']),
};

function stableSerialize(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(stableSerialize).join(',')}]`;
	}
	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj).sort();
	const parts = keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`);
	return `{${parts.join(',')}}`;
}

/**
 * Wrap a tool registry with an in-memory run-scoped cache for deterministic read actions.
 * Prevents duplicate queries and redundant token inflation from identical repeated tool calls.
 */
export function wrapToolRegistryWithCache(
	registry: InstanceAiToolRegistry,
	options: ToolCacheOptions = {},
): InstanceAiToolRegistry {
	const deterministicActions = options.deterministicActions ?? DEFAULT_DETERMINISTIC_ACTIONS;
	const cache = new Map<string, unknown>();
	const wrapped = createToolRegistry();

	for (const [name, tool] of registry) {
		const allowedActions = deterministicActions[name];
		if (!allowedActions || typeof tool.handler !== 'function') {
			wrapped.set(name, tool);
			continue;
		}

		const originalHandler = tool.handler.bind(tool);
		wrapped.set(name, {
			...tool,
			handler: async (input, context) => {
				const action =
					typeof input === 'object' && input !== null && 'action' in input
						? String((input as Record<string, unknown>).action)
						: undefined;

				if (!action || !allowedActions.has(action)) {
					return await originalHandler(input, context);
				}

				const cacheKey = `${name}:${action}:${stableSerialize(input)}`;
				if (cache.has(cacheKey)) {
					return cache.get(cacheKey);
				}

				const result = await originalHandler(input, context);
				cache.set(cacheKey, result);
				return result;
			},
		});
	}

	return wrapped;
}
