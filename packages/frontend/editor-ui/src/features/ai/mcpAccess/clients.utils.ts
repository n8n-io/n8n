import type { Component } from 'vue';

import { MCP_CLIENT_BRAND_MATCHERS, MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import type {
	McpClientBrandName,
	McpClientConnectedPeriod,
	McpClientType,
	McpClientTypeFilter,
	OAuthClientResponseDto,
} from '@n8n/api-types';
import type { BaseTextKey, I18nClass } from '@n8n/i18n';

import ClaudeIcon from './assets/client-icons/claude.svg?component';
import CursorIcon from './assets/client-icons/cursor.svg?component';
import MistralIcon from './assets/client-icons/mistral.svg?component';
import OpenAiIcon from './assets/client-icons/openai.svg?component';
import VsCodeIcon from './assets/client-icons/vscode.svg?component';

export interface McpClientBrand {
	icon: Component | null;
	type: McpClientType | null;
}

/** Logos for the brands recognized by the shared name-pattern matchers. */
const BRAND_ICONS: Record<McpClientBrandName, Component> = {
	claude: ClaudeIcon,
	cursor: CursorIcon,
	vscode: VsCodeIcon,
	openai: OpenAiIcon,
	mistral: MistralIcon,
};

// Client names are bounded (a user's own registered clients), so memoizing the
// regex scan by name is safe; the map would need eviction only if that set ever
// became unbounded.
const brandCache = new Map<string, McpClientBrand>();

export function getClientBrand(clientName: string): McpClientBrand {
	let brand = brandCache.get(clientName);
	if (!brand) {
		const match = MCP_CLIENT_BRAND_MATCHERS.find(({ pattern }) => pattern.test(clientName));
		brand = match
			? { icon: BRAND_ICONS[match.brand], type: match.type }
			: { icon: null, type: null };
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
 * Whether a grant covers every scope the instance currently offers.
 * Older grants need fresh consent for scopes introduced after they were made.
 *
 * `offeredScopes` comes from the backend, which drops scopes this instance
 * cannot serve (agent scopes when the agents module is off). Without it a
 * full grant on such an instance would never count as full access.
 */
export function isFullAccessGrant(scopes: string[], offeredScopes?: string[]): boolean {
	const required = offeredScopes?.length ? offeredScopes : MCP_INSTANCE_SCOPES;
	return scopes.length > 0 && required.every((scope) => scopes.includes(scope));
}

/** Scopes spelled out in a one-line grant summary before the rest collapse into "+N". */
const ACCESS_SUMMARY_VISIBLE_SCOPES = 2;

/**
 * One-line summary of a client's grant for list rows: "Full access", "No access",
 * or the first two scope labels followed by a "+N" overflow.
 */
export function getAccessSummary(
	i18n: Pick<I18nClass, 'baseText'>,
	client: Pick<OAuthClientResponseDto, 'scopes'>,
	offeredScopes?: string[],
): string {
	if (client.scopes.length === 0) return i18n.baseText('settings.mcp.oAuthClients.access.none');
	if (isFullAccessGrant(client.scopes, offeredScopes)) {
		return i18n.baseText('settings.mcp.oAuthClients.access.full');
	}
	const visible = client.scopes
		.slice(0, ACCESS_SUMMARY_VISIBLE_SCOPES)
		.map((scope) => scopeLabel(i18n, scope))
		.join(', ');
	const remaining = client.scopes.length - ACCESS_SUMMARY_VISIBLE_SCOPES;
	if (remaining <= 0) return visible;
	return `${visible} ${i18n.baseText('settings.mcp.oAuthClients.scope.more', {
		interpolate: { count: remaining },
	})}`;
}

/** UI state of the connected-clients search + filter popover; applied server-side. */
export interface OAuthClientFilters {
	search: string;
	type: McpClientTypeFilter | null;
	ownerId: string | null;
	connected: McpClientConnectedPeriod | null;
}

export const EMPTY_OAUTH_CLIENT_FILTERS: OAuthClientFilters = {
	search: '',
	type: null,
	ownerId: null,
	connected: null,
};
