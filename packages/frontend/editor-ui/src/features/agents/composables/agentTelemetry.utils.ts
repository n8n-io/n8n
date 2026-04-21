import type { AgentJsonConfig, AgentJsonToolRef, AgentResource } from '../types';

export type AgentTelemetryStatus = 'draft' | 'production';

export type AgentConfigFingerprint = {
	instructions_hash: string;
	instructions_length: number;
	tools: string[];
	triggers: string[];
	memory: { enabled: boolean; storage: 'n8n' | 'sqlite' | 'postgres' } | null;
	model: string | null;
	config_version: string;
};

export async function sha256Hex16(input: string): Promise<string> {
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

export async function buildAgentConfigFingerprint(
	config: AgentJsonConfig | null,
	connectedTriggers: string[],
): Promise<AgentConfigFingerprint> {
	const instructions = config?.instructions ?? '';
	const instructionsHash = await sha256Hex16(instructions);
	const tools = toolIdentifiersFromConfig(config);
	const triggers = [...connectedTriggers].sort();
	const memory = config?.memory
		? { enabled: config.memory.enabled, storage: config.memory.storage }
		: null;
	const model = config?.model ?? null;

	const versionPayload = JSON.stringify({
		instructionsHash,
		tools,
		triggers,
		memory,
		model,
	});
	const configVersion = await sha256Hex16(versionPayload);

	return {
		instructions_hash: instructionsHash,
		instructions_length: instructions.length,
		tools,
		triggers,
		memory,
		model,
		config_version: configVersion,
	};
}

export function deriveAgentStatus(agent: AgentResource | null): AgentTelemetryStatus {
	if (!agent?.publishedVersion) return 'draft';
	return agent.versionId === agent.publishedVersion.publishedFromVersionId ? 'production' : 'draft';
}
