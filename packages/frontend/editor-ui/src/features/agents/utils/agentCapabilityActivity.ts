import type { AgentNodeCapability } from '@n8n/api-types';

export type AgentCapabilityActivityKey = string;

export function toolActivityKey(name: string): AgentCapabilityActivityKey {
	return `tool:${name}`;
}

export function skillIdActivityKey(id: string): AgentCapabilityActivityKey {
	return `skill:id:${id}`;
}

export function skillNameActivityKey(name: string): AgentCapabilityActivityKey {
	return `skill:name:${name}`;
}

export function capabilityActivityKeys(
	capability: AgentNodeCapability,
): AgentCapabilityActivityKey[] {
	if (capability.kind === 'tool') return [toolActivityKey(capability.name)];
	if (capability.id !== undefined) return [skillIdActivityKey(capability.id)];
	return [skillNameActivityKey(capability.name)];
}
