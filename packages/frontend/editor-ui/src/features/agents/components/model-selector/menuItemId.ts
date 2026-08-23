/**
 * Model selector dropdown item ids encode `provider::action::value`, e.g.
 * "openai::model::gpt-5-mini" or "anthropic::credential::abc123".
 */
export function buildMenuItemId(provider: string, action: string, value: string): string {
	return `${provider}::${action}::${encodeURIComponent(value)}`;
}

export interface ParsedMenuItemId {
	provider: string;
	action: string;
	value: string;
}

export function parseMenuItemId(id: string): ParsedMenuItemId | null {
	const [provider, action, rawValue] = id.split('::');
	if (!provider || !action || !rawValue) return null;
	return { provider, action, value: decodeURIComponent(rawValue) };
}
