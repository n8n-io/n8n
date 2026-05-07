import type { AgentIntegration } from '@n8n/api-types';

import type { Agent } from '../entities/agent.entity';
import type { AgentJsonConfig } from './agent-json-config';

/**
 * Build the unified `AgentJsonConfig` view from an agent entity. The schema
 * column holds everything except triggers, which live on `agent.integrations`.
 * The builder LLM consumes the merged shape.
 */
export function composeJsonConfig(agent: Agent): AgentJsonConfig | null {
	if (!agent.schema) return null;
	return {
		...agent.schema,
		integrations: agent.integrations ?? [],
	};
}

/**
 * Split an inbound `AgentJsonConfig` into the part stored on `agent.schema` and
 * the part stored on `agent.integrations`. Inverse of `composeJsonConfig`.
 */
export function decomposeJsonConfig(config: AgentJsonConfig): {
	schemaConfig: Omit<AgentJsonConfig, 'integrations'>;
	integrations: AgentIntegration[];
} {
	const { integrations, ...schemaConfig } = config;
	return { schemaConfig, integrations: integrations ?? [] };
}

/**
 * Coerce a display name into a tool name that satisfies the
 * Anthropic/OpenAI constraint `^[a-zA-Z0-9_-]{1,128}$`. Applied at runtime
 * only — the persisted `tool.name` keeps the user's original display string
 * (e.g. "D&D Invite"), and the LLM-facing name is derived from it on the
 * fly. Already-valid names pass through unchanged.
 */
export function sanitizeToolName(name: string): string {
	if (/^[a-zA-Z0-9_-]{1,128}$/.test(name)) return name;
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 128);
}
