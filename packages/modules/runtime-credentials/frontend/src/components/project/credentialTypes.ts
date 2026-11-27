import { get } from '@n8n/rest-api-client';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the display names from the static type file that the editor also loads. The server frees
 * the type descriptions from memory after startup, so this file is the one place that still has them.
 */
export async function fetchCredentialTypeNames(baseUrl: string): Promise<Map<string, string>> {
	const types: unknown = await get(baseUrl, 'types/credentials.json');
	const result = new Map<string, string>();
	if (!Array.isArray(types)) return result;

	for (const type of types as unknown[]) {
		if (isRecord(type) && typeof type.name === 'string' && typeof type.displayName === 'string') {
			result.set(type.name, type.displayName);
		}
	}
	return result;
}
