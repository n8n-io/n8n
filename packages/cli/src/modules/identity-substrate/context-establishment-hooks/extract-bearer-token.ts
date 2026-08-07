import type { INodeExecutionData } from 'n8n-workflow';

const MAX_HEADER_LENGTH = 8192;
const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

/**
 * Extracts a bearer token from the first trigger item's `authorization`
 * header. Never throws - returns `null` for any input it can't extract a
 * token from (no items, no header, wrong scheme, non-string value), since a
 * global context-establishment hook must never fail the execution over a
 * missing or malformed header.
 */
export function extractBearerToken(triggerItems: INodeExecutionData[] | null): string | null {
	if (!triggerItems || triggerItems.length === 0) return null;

	const headers = triggerItems[0]?.json?.['headers'];
	if (headers === null || typeof headers !== 'object' || Array.isArray(headers)) return null;

	const value = (headers as Record<string, unknown>)['authorization'];
	if (typeof value !== 'string') return null;

	const match = BEARER_PATTERN.exec(value.slice(0, MAX_HEADER_LENGTH));
	const token = match?.[1]?.trim();
	return token || null;
}
