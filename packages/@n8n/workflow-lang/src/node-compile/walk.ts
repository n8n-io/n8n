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
	validateType?: string;
	ignoreValidationDuringExecution?: boolean;
	displayOptions?: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> };
}

export interface WalkMode {
	name?: string;
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
	'a@example.test',
	'https://example.test/id1',
	'https://docs.google.com/document/d/id1/edit',
	'https://drive.google.com/file/d/id1/view',
	'https://drive.google.com/drive/folders/id1',
	'https://example.test/d/id1/edit',
];
const LOCATOR_MISSES = ['', 'no match'];

export function locatorRule(
	property: WalkProperty | undefined,
	mode: unknown,
): { pattern: string; flags: string } | undefined {
	const rule = (property?.modes ?? []).find((entry) => entry.name === mode)?.extractValue;
	if (rule === undefined || rule.type !== 'regex') return undefined;
	if (typeof rule.regex === 'string') return { pattern: rule.regex, flags: '' };
	return rule.regex instanceof RegExp
		? { pattern: rule.regex.source, flags: rule.regex.flags }
		: undefined;
}

function matchesRule(rule: { pattern: string; flags: string }, text: string): boolean {
	try {
		const found = new RegExp(rule.pattern, rule.flags).exec(text);
		return found !== null && found.length === 2 && typeof found[1] === 'string';
	} catch {
		return false;
	}
}

export function locatorSample(property: WalkProperty | undefined): Json {
	const rule = locatorRule(property, 'id');
	const sample =
		rule === undefined ? undefined : LOCATOR_SAMPLES.find((text) => matchesRule(rule, text));
	return { __rl: true, mode: 'id', value: sample ?? 'id1' };
}

export function locatorMiss(property: WalkProperty | undefined, mode: unknown): string | undefined {
	const rule = locatorRule(property, mode);
	if (rule === undefined) return undefined;
	return LOCATOR_MISSES.find((text) => {
		try {
			return new RegExp(rule.pattern, rule.flags).exec(text) === null;
		} catch {
			return false;
		}
	});
}

export function requiredParameters(node: WalkNode, version: number, start: Json): Json {
	const properties = propertiesOf(node);
	const out: Json = { ...start };
	for (const [name, value] of Object.entries(resolveParameters(node, version, start))) {
		const property = properties.find((p) => p.name === name);
		const type = property?.type;
		if (name in out) continue;
		const checked =
			property?.validateType === undefined || property.ignoreValidationDuringExecution
				? undefined
				: VALID_SAMPLES[property.validateType];
		if (type === 'string' && value === '') out[name] = checked ?? 'v1';
		else if (type === 'json' && value === '') out[name] = '{}';
		else if (type === 'number' && value === undefined) out[name] = 1;
		else if (type === 'resourceLocator') out[name] = locatorSample(property);
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
