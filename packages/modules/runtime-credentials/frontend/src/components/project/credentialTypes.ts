import { get } from '@n8n/rest-api-client';

import type { PolicedCredentialType } from './effectiveAccess';

export type CredentialTypeInfo = {
	displayName: string;
	extends: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the static type file that the editor also loads. The server frees the type descriptions
 * from memory after startup, so this file is the one place that still has them.
 */
export async function fetchCredentialTypeInfo(
	baseUrl: string,
): Promise<Map<string, CredentialTypeInfo>> {
	const types: unknown = await get(baseUrl, 'types/credentials.json');
	const result = new Map<string, CredentialTypeInfo>();
	if (!Array.isArray(types)) return result;

	for (const type of types as unknown[]) {
		if (!isRecord(type) || typeof type.name !== 'string' || typeof type.displayName !== 'string') {
			continue;
		}
		result.set(type.name, {
			displayName: type.displayName,
			extends: Array.isArray(type.extends)
				? type.extends.filter((parent): parent is string => typeof parent === 'string')
				: [],
		});
	}
	return result;
}

/** Every type that `name` builds on, directly or not. */
export function ancestorsOf(
	types: ReadonlyMap<string, CredentialTypeInfo>,
	name: string,
): string[] {
	const seen = new Set<string>([name]);
	const queue = [...(types.get(name)?.extends ?? [])];
	for (let index = 0; index < queue.length; index++) {
		const parent = queue[index];
		if (seen.has(parent)) continue;
		seen.add(parent);
		queue.push(...(types.get(parent)?.extends ?? []));
	}
	seen.delete(name);
	return [...seen];
}

export function policedType(
	types: ReadonlyMap<string, CredentialTypeInfo>,
	name: string,
): PolicedCredentialType {
	return { name, ancestors: ancestorsOf(types, name) };
}
