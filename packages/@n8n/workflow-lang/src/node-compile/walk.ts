import type { NodeDescription } from '../convert/node-parameters.ts';
import { displayParameter, getNodeParameters } from '../convert/node-parameters.ts';
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
	validateType?: string;
	ignoreValidationDuringExecution?: boolean;
	displayOptions?: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> };
}

export interface WalkMode {
	name?: string;
	placeholder?: unknown;
	extractValue?: { type?: string; regex?: unknown };
}

export interface WalkProperty {
	name: string;
	type: string;
	default?: unknown;
	modes?: WalkMode[];
	options?: WalkMember[];
	displayOptions?: { show?: Record<string, unknown[]> };
	typeOptions?: { multipleValues?: boolean };
	validateType?: string;
	ignoreValidationDuringExecution?: boolean;
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

const VALID_SAMPLES: Record<string, unknown> = {
	number: 1,
	boolean: true,
	array: ['a'],
	object: { a: 1 },
	url: 'https://example.test/a',
	jwt: 'a.b.c',
};

const LOCATOR_SAMPLES = [
	'id1',
	'12345',
	'0123456789abcdef0123456789abcdef',
	'01234567-89ab-4def-8123-456789abcdef',
	'a@example.test',
];
const LOCATOR_SAMPLE_LIMIT = 200;
const LOCATOR_MISSES = ['', 'no match'];

export function displayedProperty(
	node: WalkNode,
	version: number,
	resolved: Json,
	name: string,
): WalkProperty | undefined {
	const d = node.description;
	return propertiesOf(node).find(
		(p, at) =>
			p.name === name && displayParameter(resolved, d.properties[at], version, d, resolved),
	);
}

export function locatorRule(mode: WalkMode | undefined): RegExp | undefined {
	const rule = mode?.extractValue;
	if (!rule || rule.type !== 'regex') return undefined;
	if (rule.regex instanceof RegExp) return new RegExp(rule.regex.source, rule.regex.flags);
	return typeof rule.regex === 'string' ? new RegExp(rule.regex) : undefined;
}

export function locatorSample(mode: WalkMode | undefined): string | undefined {
	const rule = locatorRule(mode);
	if (rule === undefined) return LOCATOR_SAMPLES[0];
	const placeholder =
		typeof mode?.placeholder === 'string' && mode.placeholder.length <= LOCATOR_SAMPLE_LIMIT
			? [mode.placeholder]
			: [];
	return [...LOCATOR_SAMPLES, ...placeholder].find((sample) => rule.exec(sample) !== null);
}

export function locatorMiss(mode: WalkMode | undefined): string | undefined {
	const rule = locatorRule(mode);
	if (rule === undefined) return undefined;
	return LOCATOR_MISSES.find((text) => rule.exec(text) === null);
}

export function locatorWithoutSample(
	node: WalkNode,
	version: number,
	parameters: Json,
): string | undefined {
	const resolved = resolveParameters(node, version, parameters);
	for (const [name, value] of Object.entries(parameters)) {
		if (typeof value !== 'object' || value === null || !('mode' in value) || !('value' in value))
			continue;
		const property = displayedProperty(node, version, resolved, name);
		if (property?.type !== 'resourceLocator') continue;
		const rule = locatorRule(property.modes?.find((mode) => mode.name === value.mode));
		if (rule !== undefined && (typeof value.value !== 'string' || rule.exec(value.value) === null))
			return name;
	}
	return undefined;
}

export function requiredParameters(node: WalkNode, version: number, start: Json): Json {
	const properties = propertiesOf(node);
	const out: Json = { ...start };
	const resolved = resolveParameters(node, version, start);
	for (const [name, value] of Object.entries(resolved)) {
		const defined = properties.filter((p) => p.name === name);
		const property =
			defined.length > 1 && defined.some((p) => p.type === 'resourceLocator')
				? (displayedProperty(node, version, resolved, name) ?? defined[0])
				: defined[0];
		const type = property?.type;
		if (name in out) continue;
		const checked =
			property?.validateType === undefined || property.ignoreValidationDuringExecution
				? undefined
				: VALID_SAMPLES[property.validateType];
		if (type === 'string' && value === '') out[name] = checked ?? 'v1';
		else if (type === 'json' && value === '') out[name] = '{}';
		else if (type === 'number' && value === undefined) out[name] = 1;
		else if (type === 'resourceLocator') {
			const sample = locatorSample(property?.modes?.find((mode) => mode.name === 'id'));
			out[name] = { __rl: true, mode: 'id', value: sample ?? LOCATOR_SAMPLES[0] };
		}
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
