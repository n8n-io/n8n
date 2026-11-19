import type {
	McpServerAccessMode,
	McpServerCallStatus,
	McpServerResourceKind,
	McpServerToolBehavior,
} from '@n8n/api-types';
import type { BadgeVariant } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

export const BEHAVIOR_LABEL_KEYS: Record<McpServerToolBehavior, BaseTextKey> = {
	read: 'mcpServers.behavior.read',
	write: 'mcpServers.behavior.write',
	delete: 'mcpServers.behavior.delete',
};

export const BEHAVIOR_BADGE_VARIANTS: Record<McpServerToolBehavior, BadgeVariant> = {
	read: 'subtle',
	write: 'warning',
	delete: 'danger',
};

export const RESOURCE_KIND_LABEL_KEYS: Record<McpServerResourceKind, BaseTextKey> = {
	skill: 'mcpServers.resource.kind.skill',
	text: 'mcpServers.resource.kind.text',
	file: 'mcpServers.resource.kind.file',
};

export const ACCESS_LABEL_KEYS: Record<McpServerAccessMode, BaseTextKey> = {
	public: 'mcpServers.access.mode.public',
	apiKey: 'mcpServers.access.mode.apiKey',
	oauth: 'mcpServers.access.mode.oauth',
};

export const CALL_STATUS_LABEL_KEYS: Record<McpServerCallStatus, BaseTextKey> = {
	ok: 'mcpServers.logs.status.ok',
	error: 'mcpServers.logs.status.error',
	declined: 'mcpServers.logs.status.declined',
	rateLimited: 'mcpServers.logs.status.rateLimited',
};

export const CALL_STATUS_BADGE_VARIANTS: Record<McpServerCallStatus, BadgeVariant> = {
	ok: 'success',
	error: 'danger',
	declined: 'warning',
	rateLimited: 'subtle',
};

export const CONNECT_CLIENTS = [
	'claude',
	'claudeCode',
	'chatgpt',
	'cursor',
	'vscode',
	'codex',
] as const;
export type ConnectClient = (typeof CONNECT_CLIENTS)[number];

export const CONNECT_CLIENT_LABEL_KEYS: Record<ConnectClient, BaseTextKey> = {
	claude: 'mcpServers.connect.client.claude',
	claudeCode: 'mcpServers.connect.client.claudeCode',
	chatgpt: 'mcpServers.connect.client.chatgpt',
	cursor: 'mcpServers.connect.client.cursor',
	vscode: 'mcpServers.connect.client.vscode',
	codex: 'mcpServers.connect.client.codex',
};

/** Placeholder the person replaces with their own key. Never a real key. */
export const API_KEY_PLACEHOLDER = '<your key>';

export interface ConnectSnippetInput {
	slug: string;
	url: string;
	accessMode: McpServerAccessMode;
}

export function claudeCodeCommand({ slug, url, accessMode }: ConnectSnippetInput): string {
	const base = `claude mcp add --transport http ${slug} ${url}`;
	return accessMode === 'apiKey'
		? `${base} --header "Authorization: Bearer ${API_KEY_PLACEHOLDER}"`
		: base;
}

export function cursorJson({ slug, url, accessMode }: ConnectSnippetInput): string {
	const entry: Record<string, unknown> = { url };
	if (accessMode === 'apiKey') entry.headers = { Authorization: `Bearer ${API_KEY_PLACEHOLDER}` };
	return JSON.stringify({ mcpServers: { [slug]: entry } }, null, 2);
}

export function vscodeJson({ slug, url, accessMode }: ConnectSnippetInput): string {
	const entry: Record<string, unknown> = { type: 'http', url };
	if (accessMode === 'apiKey') entry.headers = { Authorization: `Bearer ${API_KEY_PLACEHOLDER}` };
	return JSON.stringify({ servers: { [slug]: entry } }, null, 2);
}

export function codexSnippet({ slug, url, accessMode }: ConnectSnippetInput): string {
	const tomlKey = slug.replace(/-/g, '_');
	const lines = [`[mcp_servers.${tomlKey}]`, `url = "${url}"`];
	if (accessMode === 'apiKey') {
		lines.push(`http_headers = { "Authorization" = "Bearer ${API_KEY_PLACEHOLDER}" }`);
	}
	return lines.join('\n');
}

/** Cursor's one-click install link. The config holds only the URL, never a key. */
export function cursorDeepLink({ slug, url }: ConnectSnippetInput): string {
	const config = btoa(JSON.stringify({ url }));
	return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(slug)}&config=${encodeURIComponent(config)}`;
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat().format(value);
}

export function formatPercent(rate: number): string {
	const percent = rate * 100;
	return `${percent >= 10 || percent === 0 ? Math.round(percent) : percent.toFixed(1)}%`;
}

export function formatDuration(ms: number | null | undefined): string {
	if (ms === null || ms === undefined) return '–';
	if (ms < 1000) return `${Math.round(ms)} ms`;
	return `${(ms / 1000).toFixed(1)} s`;
}

/** Time of day for today's calls, date and time for older ones. */
export function formatTime(iso: string): string {
	const date = new Date(iso);
	const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	if (date.toDateString() === new Date().toDateString()) return time;
	return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${time}`;
}

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function toPrettyJson(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
