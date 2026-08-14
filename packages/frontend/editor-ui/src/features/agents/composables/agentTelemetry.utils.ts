import type { AgentJsonConfig, AgentJsonToolRef, AgentResource } from '../types';

export type AgentTelemetryStatus = 'draft' | 'production';

export type AgentConfigFingerprint = {
	instructions: string;
	tools: string[];
	skills: string[];
	tasks: string[];
	triggers: string[];
	vector_stores: string[];
	memory: { enabled: boolean; storage: 'n8n' } | null;
	model: string | null;
	config_version: string;
};

/**
 * Internal helper used to compute a stable 16-char hex `config_version` join
 * key. Not a privacy mechanism — agent payloads carry the raw config fields.
 */
async function sha256Hex16(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	const hex = Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return hex.slice(0, 16);
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
): Promise<AgentConfigFingerprint> {
	const instructions = config?.instructions ?? '';
	const tools = toolIdentifiersFromConfig(config);
	const skills = skillIdentifiersFromConfig(config);
	const tasks = taskIdentifiersFromConfig(config);
	const triggers = [...connectedTriggers].sort();
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
		instructions,
		tools,
		skills,
		tasks,
		triggers,
		vector_stores: vectorStores,
		memory,
		model,
		config_version: configVersion,
	};
}

export function deriveAgentStatus(agent: AgentResource | null): AgentTelemetryStatus {
	if (!agent?.activeVersionId) return 'draft';
	return agent.versionId === agent.activeVersionId ? 'production' : 'draft';
}
