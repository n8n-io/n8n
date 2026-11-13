/**
 * The credentials helper of the v1 run (n8n's engine in process). It does
 * what `packages/cli/src/credentials-helper.ts` does for a node run:
 * - `getDecrypted` gives the data of the credential type, with the defaults
 *   of the type's properties and its expressions over `$self` resolved
 *   (`applyDefaultsAndOverwrites`), so the data is what n8n would give;
 * - `authenticate` signs a request with the type's `authenticate` rule;
 * - `preAuthentication` fetches an expirable token when it is empty;
 * - token updates stay in memory.
 * `resolveCredentialData` gives the same resolved data to the compiled run.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { isRecord, packageRoot } from './sample.ts';

const hostPackage = join(packageRoot, '..', 'workflow-fallback-host', 'package.json');
const req = createRequire(hostPackage);

type Data = Record<string, unknown>;

interface CredentialProperty {
	name: string;
	type?: string;
	default?: unknown;
	typeOptions?: { expirable?: boolean };
}

interface CredentialType {
	name: string;
	properties: CredentialProperty[];
	authenticate?: unknown;
	preAuthentication?: unknown;
}

function call(target: unknown, method: string, ...args: unknown[]): unknown {
	const fn: unknown = Reflect.get(Object(target), method);
	if (typeof fn !== 'function') throw new Error(`${method} is not a function`);
	return Reflect.apply(fn, target, args);
}

let typesInstance: unknown;

function credentialTypes(): {
	get(name: string): CredentialType | undefined;
	parentTypes(name: string): string[];
} {
	if (!typesInstance) {
		const mod: unknown = req(
			join(packageRoot, '..', 'workflow-fallback-host', 'dist', 'credential-types.js'),
		);
		const ctor: unknown = Reflect.get(Object(mod), 'HostCredentialTypes');
		if (typeof ctor !== 'function') throw new Error('HostCredentialTypes is missing');
		typesInstance = Reflect.construct(ctor, []);
	}
	const types = typesInstance;
	return {
		get(name) {
			const t: unknown = call(types, 'get', name);
			if (!isRecord(t) || !Array.isArray(t.properties)) return undefined;
			return {
				name: String(t.name),
				properties: t.properties.filter(
					(p): p is CredentialProperty => isRecord(p) && typeof p.name === 'string',
				),
				authenticate: t.authenticate,
				preAuthentication: t.preAuthentication,
			};
		},
		parentTypes(name) {
			const out: unknown = call(types, 'parentTypes', name);
			return Array.isArray(out) ? out.filter((x): x is string => typeof x === 'string') : [];
		},
	};
}

function workflowModule(): Record<string, unknown> {
	const mod: unknown = req('n8n-workflow');
	if (!isRecord(mod)) throw new Error('n8n-workflow did not load');
	return mod;
}

/** A one-node workflow for expression evaluation, as the CLI's `mockNode`. */
function mockWorkflow(): { workflow: unknown; node: Data } {
	const wf = workflowModule();
	const node = {
		id: 'gym-credential',
		name: 'Credential',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const nodeType = { description: { properties: [], inputs: ['main'], outputs: ['main'] } };
	const nodeTypes = {
		getByName: () => nodeType,
		getByNameAndVersion: () => nodeType,
		getKnownTypes: () => ({}),
	};
	const ctor = wf.Workflow;
	if (typeof ctor !== 'function') throw new Error('n8n-workflow has no Workflow');
	const workflow: unknown = Reflect.construct(ctor, [
		{ nodes: [node], connections: {}, active: false, nodeTypes },
	]);
	return { workflow, node };
}

function resolveDeep(value: unknown, resolve: (s: string) => unknown): unknown {
	if (typeof value === 'string') return value.startsWith('=') ? resolve(value) : value;
	if (Array.isArray(value)) return value.map((v) => resolveDeep(v, resolve));
	if (isRecord(value)) {
		const out: Data = {};
		for (const [k, v] of Object.entries(value)) out[k] = resolveDeep(v, resolve);
		return out;
	}
	return value;
}

/** The data that n8n gives a node: type defaults added and `$self` expressions resolved. */
export function resolveCredentialData(type: string, data: Data): Data {
	const t = credentialTypes().get(type);
	if (!t) return { ...data };
	const wf = workflowModule();
	const helpers = wf.NodeHelpers;
	const props = [...t.properties];
	// Parent types (oAuth2Api) define fields too.
	for (const parent of credentialTypes().parentTypes(type)) {
		for (const p of credentialTypes().get(parent)?.properties ?? []) {
			if (!props.some((x) => x.name === p.name)) props.push(p);
		}
	}
	const withDefaults: unknown = call(
		helpers,
		'getNodeParameters',
		props,
		data,
		true,
		false,
		null,
		null,
	);
	const out: Data = isRecord(withDefaults) ? { ...withDefaults } : { ...data };
	for (const key of ['oauthTokenData', 'allowedHttpRequestDomains', 'allowedDomains']) {
		if (out[key] === undefined && data[key] !== undefined) out[key] = data[key];
	}
	const { workflow, node } = mockWorkflow();
	const expression: unknown = Reflect.get(Object(workflow), 'expression');
	const self = { ...out };
	return Object.fromEntries(
		Object.entries(out).map(([k, v]) => [
			k,
			resolveDeep(v, (s) =>
				call(
					expression,
					'getSimpleParameterValue',
					node,
					s,
					'internal',
					{ $self: self },
					undefined,
					'',
				),
			),
		]),
	);
}

/** The `credentialsHelper` of `additionalData`, for credential data by type. */
export function gymCredentialsHelper(byType: Map<string, Data>): Data {
	const types = credentialTypes();
	const dataFor = (type: string): Data => {
		const own = byType.get(type);
		if (own) return own;
		for (const [t, d] of byType) if (types.parentTypes(t).includes(type)) return d;
		throw new Error(`No gym credential of type ${type}`);
	};
	return {
		getParentTypes: (name: string) => types.parentTypes(name),
		isCredentialUsableByNode: () => true,
		getCredentialsProperties: (name: string) => types.get(name)?.properties ?? [],
		getDecrypted: async (_additionalData: unknown, _nodeCredentials: unknown, type: string) => ({
			...dataFor(type),
		}),
		getCredentials: async () => {
			throw new Error('The gym run gives decrypted data only');
		},
		updateCredentials: async () => undefined,
		updateCredentialsOauthTokenData: async () => undefined,
		async authenticate(
			credentials: Data,
			typeName: string,
			options: Data,
			workflow?: unknown,
			node?: unknown,
		) {
			const rule = types.get(typeName)?.authenticate;
			if (typeof rule === 'function')
				return await Promise.resolve(Reflect.apply(rule, undefined, [credentials, options]));
			if (!isRecord(rule) || rule.type !== 'generic' || !isRecord(rule.properties)) return options;
			const expression: unknown = Reflect.get(Object(workflow), 'expression');
			const resolve = (value: string): string => {
				if (!value.startsWith('=')) return value;
				const r: unknown = call(
					expression,
					'getSimpleParameterValue',
					node,
					value,
					'internal',
					{ $credentials: credentials },
					undefined,
					'',
				);
				if (r === undefined || r === null || r === '') return '';
				if (typeof r === 'string') return r;
				if (typeof r === 'number' || typeof r === 'boolean') return String(r);
				return JSON.stringify(r);
			};
			options.headers ??= {};
			for (const [part, entries] of Object.entries(rule.properties)) {
				if (!isRecord(entries)) continue;
				const current = options[part];
				const target: Data = isRecord(current) ? current : {};
				options[part] = target;
				for (const [key, value] of Object.entries(entries)) {
					target[resolve(key)] = typeof value === 'string' ? resolve(value) : value;
				}
			}
			return options;
		},
		async preAuthentication(
			helpers: unknown,
			credentials: Data,
			typeName: string,
			_node: unknown,
			expired: boolean,
		) {
			const t = types.get(typeName);
			const expirable = t?.properties.find(
				(p) => p.type === 'hidden' && p.typeOptions?.expirable === true,
			);
			if (!t || !expirable || typeof t.preAuthentication !== 'function') return undefined;
			if (credentials[expirable.name] !== '' && !expired) return undefined;
			const output: unknown = await Promise.resolve(
				Reflect.apply(t.preAuthentication, helpers, [credentials]),
			);
			if (!isRecord(output) || output[expirable.name] === undefined) return undefined;
			const merged = Object.assign(credentials, output);
			byType.set(typeName, { ...merged });
			return merged;
		},
		async runPreAuthentication(helpers: unknown, credentials: Data, typeName: string) {
			const t = types.get(typeName);
			if (!t || typeof t.preAuthentication !== 'function') return undefined;
			const output: unknown = await Promise.resolve(
				Reflect.apply(t.preAuthentication, helpers, [credentials]),
			);
			return isRecord(output) ? output : undefined;
		},
	};
}
