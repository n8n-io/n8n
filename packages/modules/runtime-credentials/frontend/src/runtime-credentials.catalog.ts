import { get } from '@n8n/rest-api-client';
import type { Themed } from 'n8n-workflow';

/** One property of a credential type, as far as the rule wizard needs it. */
export type CredentialTypeProperty = {
	name: string;
	displayName: string;
	type: string;
};

export type CredentialTypeInfo = {
	name: string;
	displayName: string;
	icon?: Themed<string>;
	iconUrl?: Themed<string>;
	iconColor?: string;
	/** Parent types, nearest first as the type file lists them. */
	extends?: string[];
	properties: CredentialTypeProperty[];
};

export type NodeTypeInfo = {
	name: string;
	displayName: string;
	icon?: Themed<string>;
	iconUrl?: Themed<string>;
	iconColor?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toThemed(value: unknown): Themed<string> | undefined {
	if (typeof value === 'string') return value;
	if (isRecord(value) && typeof value.light === 'string' && typeof value.dark === 'string') {
		return { light: value.light, dark: value.dark };
	}
	return undefined;
}

/**
 * The editor reads these static files too. The server frees the type descriptions from memory
 * after startup, and no REST route lists them, so the files are the only source a module can use.
 */
async function readTypesFile(baseUrl: string, file: string): Promise<unknown[]> {
	const types: unknown = await get(baseUrl, file);
	return Array.isArray(types) ? types : [];
}

function toProperties(value: unknown): CredentialTypeProperty[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((property: unknown) => {
		if (!isRecord(property)) return [];
		const { name, displayName, type } = property;
		if (typeof name !== 'string' || typeof type !== 'string') return [];
		return [{ name, displayName: typeof displayName === 'string' ? displayName : name, type }];
	});
}

async function readCredentialTypes(baseUrl: string): Promise<Map<string, CredentialTypeInfo>> {
	const types = await readTypesFile(baseUrl, 'types/credentials.json');
	const result = new Map<string, CredentialTypeInfo>();
	for (const type of types) {
		if (!isRecord(type) || typeof type.name !== 'string') continue;
		result.set(type.name, {
			name: type.name,
			displayName: typeof type.displayName === 'string' ? type.displayName : type.name,
			icon: toThemed(type.icon),
			iconUrl: toThemed(type.iconUrl),
			iconColor: typeof type.iconColor === 'string' ? type.iconColor : undefined,
			extends: Array.isArray(type.extends)
				? type.extends.filter((parent): parent is string => typeof parent === 'string')
				: undefined,
			properties: toProperties(type.properties),
		});
	}
	return result;
}

async function readNodeTypes(baseUrl: string): Promise<Map<string, NodeTypeInfo>> {
	const types = await readTypesFile(baseUrl, 'types/nodes.json');
	const result = new Map<string, NodeTypeInfo>();
	for (const type of types) {
		if (!isRecord(type) || typeof type.name !== 'string' || result.has(type.name)) continue;
		result.set(type.name, {
			name: type.name,
			displayName: typeof type.displayName === 'string' ? type.displayName : type.name,
			icon: toThemed(type.icon),
			iconUrl: toThemed(type.iconUrl),
			iconColor: typeof type.iconColor === 'string' ? type.iconColor : undefined,
		});
	}
	return result;
}

export async function fetchCredentialTypeCatalog(
	baseUrl: string,
): Promise<Map<string, CredentialTypeInfo>> {
	return await readCredentialTypes(baseUrl);
}

export async function fetchNodeTypeCatalog(baseUrl: string): Promise<Map<string, NodeTypeInfo>> {
	return await readNodeTypes(baseUrl);
}
