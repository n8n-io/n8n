import type { BuiltTool } from '@n8n/agents';

import type { InstanceAiToolRegistry } from './types';

export function createToolRegistry(
	entries: Iterable<readonly [string, BuiltTool]> = [],
): InstanceAiToolRegistry {
	return new Map(entries);
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
