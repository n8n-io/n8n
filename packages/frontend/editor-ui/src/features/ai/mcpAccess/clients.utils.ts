import type { Component } from 'vue';

import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

import ClaudeIcon from './assets/client-icons/claude.svg?component';
import CursorIcon from './assets/client-icons/cursor.svg?component';
import OpenAiIcon from './assets/client-icons/openai.svg?component';
import VsCodeIcon from './assets/client-icons/vscode.svg?component';

export type McpClientType = 'cli' | 'ide' | 'editor' | 'assistant';

export interface McpClientBrand {
	icon: Component | null;
	type: McpClientType | null;
}

/**
 * Client names are free-form (self-reported at OAuth registration), so known
 * clients are recognized by name patterns. First match wins: more specific
 * patterns (e.g. "Claude Code") must come before broader ones ("Claude").
 */
const BRAND_MATCHERS: Array<{ pattern: RegExp; brand: McpClientBrand }> = [
	{ pattern: /claude[ -]?code/i, brand: { icon: ClaudeIcon, type: 'cli' } },
	{ pattern: /claude/i, brand: { icon: ClaudeIcon, type: 'assistant' } },
	{ pattern: /cursor/i, brand: { icon: CursorIcon, type: 'ide' } },
	{ pattern: /(visual studio code|vs ?code)/i, brand: { icon: VsCodeIcon, type: 'editor' } },
	{ pattern: /codex/i, brand: { icon: OpenAiIcon, type: 'cli' } },
	{ pattern: /chatgpt|openai/i, brand: { icon: OpenAiIcon, type: 'assistant' } },
];

// Client names are bounded (a user's own registered clients), so memoizing the
// regex scan by name is safe; the map would need eviction only if that set ever
// became unbounded.
const brandCache = new Map<string, McpClientBrand>();

export function getClientBrand(clientName: string): McpClientBrand {
	let brand = brandCache.get(clientName);
	if (!brand) {
		brand = BRAND_MATCHERS.find(({ pattern }) => pattern.test(clientName))?.brand ?? {
			icon: null,
			type: null,
		};
		brandCache.set(clientName, brand);
	}
	return brand;
}

/**
 * i18n key suffix for a granted scope's human label, e.g. `workflow:read` →
 * `workflow.read`. Unknown scopes have no label and are rendered verbatim.
 */
export function scopeLabelKeySuffix(scope: string): string {
	return scope.replace(':', '.');
}

/**
 * Human label for a granted scope. Unknown scopes have no i18n entry and render
 * verbatim.
 */
export function scopeLabel(
	i18n: { baseText: (key: BaseTextKey) => string },
	scope: string,
): string {
	const key = `settings.mcp.oAuthClients.scope.${scopeLabelKeySuffix(scope)}` as BaseTextKey;
	const label = i18n.baseText(key);
	return label === key ? scope : label;
}

/**
 * Whether a grant covers every scope the instance offers. Pre-scoping grants
 * are backfilled to the full launch scope set, so they surface as a single
 * "Full access" label rather than an enumeration of every scope.
 */
export function isFullAccessGrant(scopes: string[]): boolean {
	return scopes.length > 0 && MCP_INSTANCE_SCOPES.every((scope) => scopes.includes(scope));
}
