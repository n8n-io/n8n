import type { Component } from 'vue';

import ClaudeIcon from './assets/client-icons/claude.svg';
import CursorIcon from './assets/client-icons/cursor.svg';
import OpenAiIcon from './assets/client-icons/openai.svg';
import VsCodeIcon from './assets/client-icons/vscode.svg';

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

export function getClientBrand(clientName: string): McpClientBrand {
	return (
		BRAND_MATCHERS.find(({ pattern }) => pattern.test(clientName))?.brand ?? {
			icon: null,
			type: null,
		}
	);
}

/**
 * i18n key suffix for a granted scope's human label, e.g. `workflow:read` →
 * `workflow.read`. Unknown scopes have no label and are rendered verbatim.
 */
export function scopeLabelKeySuffix(scope: string): string {
	return scope.replace(':', '.');
}
