import { isDraftIntegration } from '@n8n/api-types';
import { sha256 } from '@n8n/utils/sha256';

import type { AgentJsonConfig, AgentJsonToolRef, AgentResource } from '../types';

export type AgentTelemetryStatus = 'draft' | 'production';

export type AgentConfigFingerprint = {
	skills: string[];
	tasks: string[];
	triggers: string[];
	memory: { enabled: boolean; storage: 'n8n' } | null;
	config_version: string;
};

/**
 * Compute a stable join key. Keep the configuration text inside the hash input.
 */
async function sha256Hex16(input: string): Promise<string> {
	return (await sha256(input)).slice(0, 16);
}

function toolIdentifier(ref: AgentJsonToolRef): string {
	if (ref.type === 'custom') return ref.id ?? '';
	if (ref.type === 'workflow') return ref.name ?? ref.workflow ?? '';
	return ref.name ?? ref.node?.nodeType ?? '';
}

export function toolIdentifiersFromConfig(config: AgentJsonConfig | null): string[] {
	return (config?.tools ?? []).map(toolIdentifier).filter(Boolean).sort();
}

export function skillIdentifiersFromConfig(config: AgentJsonConfig | null): string[] {
	return (config?.skills ?? [])
		.map((ref) => ref.id)
		.filter(Boolean)
		.sort();
}

export function taskIdentifiersFromConfig(config: AgentJsonConfig | null): string[] {
	return Array.from(new Set((config?.tasks ?? []).map((ref) => ref.id).filter(Boolean))).sort();
}

export async function buildAgentConfigFingerprint(
	config: AgentJsonConfig | null,
	connectedTriggers: string[],
	additionalConfiguredTriggers: string[] = [],
): Promise<AgentConfigFingerprint> {
	const instructions = config?.instructions ?? '';
	const tools = toolIdentifiersFromConfig(config);
	const skills = skillIdentifiersFromConfig(config);
	const tasks = taskIdentifiersFromConfig(config);
	const configuredTriggers = new Set([
		...(config?.integrations ?? [])
			.filter((integration) => !isDraftIntegration(integration))
			.map((integration) => integration.type),
		...additionalConfiguredTriggers,
	]);
	const triggers = connectedTriggers.filter((trigger) => configuredTriggers.has(trigger)).sort();
	const vectorStores = (config?.vectorStores ?? [])
		.map((store) => `${store.provider}:${store.name}`)
		.sort();
	const memory = config?.memory
		? { enabled: config.memory.enabled, storage: config.memory.storage }
		: null;
	const model = config?.model ?? null;

	const versionPayload = JSON.stringify({
		instructions,
		tools,
		skills,
		tasks,
		triggers,
		vector_stores: vectorStores,
		memory,
		model,
	});
	const configVersion = await sha256Hex16(versionPayload);

	return {
		skills,
		tasks,
		triggers,
		memory,
		config_version: configVersion,
	};
}

export function deriveAgentStatus(agent: AgentResource | null): AgentTelemetryStatus {
	if (!agent?.activeVersionId) return 'draft';
	return agent.versionId === agent.activeVersionId ? 'production' : 'draft';
}
