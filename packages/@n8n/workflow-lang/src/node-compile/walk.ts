import type { NodeDescription } from '../convert/node-parameters.ts';
import { getNodeParameters } from '../convert/node-parameters.ts';
import type { CredentialTypeRegistry } from '../credentials/types.ts';

export type Json = Record<string, unknown>;

export interface WalkMember {
	name?: string;
	value?: unknown;
	type?: string;
	default?: unknown;
	options?: WalkMember[];
	values?: WalkMember[];
	typeOptions?: { multipleValues?: boolean };
}

export interface WalkProperty {
	name: string;
	type: string;
	default?: unknown;
	options?: WalkMember[];
	displayOptions?: { show?: Record<string, unknown[]> };
	typeOptions?: { multipleValues?: boolean };
}

export interface WalkNode {
	description: NodeDescription & {
		version: number | number[];
		credentials?: Array<{ name: string; displayOptions?: { show?: Record<string, unknown[]> } }>;
	};
}

export function propertiesOf(node: WalkNode): WalkProperty[] {
	return node.description.properties as unknown as WalkProperty[];
}

export function resolveParameters(node: WalkNode, version: number, parameters: Json): Json {
	const d = node.description;
	return getNodeParameters(d.properties, parameters, true, false, version, d) ?? {};
}

export function requiredParameters(node: WalkNode, version: number, start: Json): Json {
	const properties = propertiesOf(node);
	const out: Json = { ...start };
	for (const [name, value] of Object.entries(resolveParameters(node, version, start))) {
		const type = properties.find((p) => p.name === name)?.type;
		if (name in out) continue;
		if (type === 'string' && value === '') out[name] = 'v1';
		else if (type === 'json' && value === '') out[name] = '{}';
		else if (type === 'number' && value === undefined) out[name] = 1;
		else if (type === 'resourceLocator') out[name] = { __rl: true, mode: 'id', value: 'id1' };
	}
	return out;
}

export function operationsOf(node: WalkNode): Json[] {
	const properties = propertiesOf(node);
	const values = (p: WalkProperty) =>
		(p.options ?? []).map((o) => o.value).filter((v) => typeof v === 'string');
	const resources = properties.filter((p) => p.name === 'resource').flatMap(values);
	const out: Json[] = [];
	for (const resource of resources.length > 0 ? resources : [undefined]) {
		const shown = properties.filter(
			(p) =>
				p.name === 'operation' &&
				(resource === undefined ||
					!p.displayOptions?.show?.resource ||
					p.displayOptions.show.resource.includes(resource)),
		);
		const names = [...new Set(shown.flatMap(values))];
		for (const operation of names.length > 0 ? names : [undefined]) {
			out.push({
				...(resource === undefined ? {} : { resource }),
				...(operation === undefined ? {} : { operation }),
			});
		}
	}
	return out;
}

export function credentialOf(node: WalkNode, resolved: Json): string | undefined {
	const all = node.description.credentials ?? [];
	const shown = all.find((c) =>
		Object.entries(c.displayOptions?.show ?? {}).every(
			([name, allowed]) => name.startsWith('@') || allowed.includes(resolved[name]),
		),
	);
	return (shown ?? all[0])?.name;
}

export function fakeCredentialData(
	registry: CredentialTypeRegistry,
	type: string,
	signingKey: () => string,
): Json {
	const data: Json = {};
	const info = registry.get(type);
	const session = info?.preAuthentication === true ? info.expirable : undefined;
	for (const [key, value] of Object.entries(info?.defaults ?? {})) {
		const address = /url|host|domain|server|endpoint/i.test(key);
		const filled = address ? 'https://api.example.test' : `fake-${key}`;
		data[key] = value === '' && key !== session ? filled : value;
	}
	if (type === 'googleApi') data.privateKey = signingKey();
	if (/oauth2/i.test(type)) {
		data.oauthTokenData = {
			access_token: 'fake-token',
			token_type: 'Bearer',
			instance_url: 'https://instance.example.test',
			api_domain: 'https://api.example.test',
			...(type === 'quickBooksOAuth2Api' ? { callbackQueryString: { realmId: 'fake-realm' } } : {}),
		};
	}
	return data;
}
