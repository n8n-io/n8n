import type { AgentJsonConfig } from '@n8n/api-types';

export function tryParseConfig(text: string): { ok: true; value: AgentJsonConfig } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(text) as AgentJsonConfig };
	} catch {
		return { ok: false };
	}
}
