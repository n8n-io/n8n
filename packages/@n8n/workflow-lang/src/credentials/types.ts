/**
 * Reads n8n credential type descriptions from the built node packages
 * (`n8n-nodes-base` and `@n8n/n8n-nodes-langchain`).
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The parts of an n8n credential type that the credentials tool reads. */
export interface CredentialTypeInfo {
	name: string;
	/** Parent credential types, for example `oAuth2Api`. */
	extends?: string[];
	/**
	 * The `authenticate` property: a generic description, or `'function'` when
	 * the credential type signs requests in code.
	 */
	authenticate?: GenericAuthenticate | 'function';
	/** True when the type has a `preAuthentication` hook. */
	preAuthentication?: boolean;
	/** Defaults of the credential fields. */
	defaults?: Record<string, unknown>;
	/** The package that defines the type. */
	source?: string;
}

export interface GenericAuthenticate {
	type: string;
	properties: {
		headers?: Record<string, unknown>;
		qs?: Record<string, unknown>;
		body?: Record<string, unknown>;
		auth?: Record<string, unknown>;
	};
}

export interface CredentialTypeRegistry {
	get(name: string): CredentialTypeInfo | undefined;
	names(): string[];
}

export function registryOf(types: CredentialTypeInfo[]): CredentialTypeRegistry {
	const byName = new Map(types.map((t) => [t.name, t]));
	return {
		get: (name) => byName.get(name),
		names: () => [...byName.keys()].sort(),
	};
}

/** All parent types of a credential type, nearest first. */
export function parentTypes(registry: CredentialTypeRegistry, name: string): string[] {
	const out: string[] = [];
	const queue = [...(registry.get(name)?.extends ?? [])];
	while (queue.length > 0) {
		const next = queue.shift();
		if (next === undefined || out.includes(next)) continue;
		out.push(next);
		queue.push(...(registry.get(next)?.extends ?? []));
	}
	return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGenericAuthenticate(value: unknown): value is GenericAuthenticate {
	return isRecord(value) && typeof value.type === 'string' && isRecord(value.properties);
}

/** Reads the description of a credential class instance. */
export function describeCredentialType(instance: unknown, source?: string): CredentialTypeInfo {
	if (!isRecord(instance) || typeof instance.name !== 'string') {
		throw new Error('the object is not a credential type');
	}
	const info: CredentialTypeInfo = { name: instance.name, source };
	if (Array.isArray(instance.extends)) {
		info.extends = instance.extends.filter((x): x is string => typeof x === 'string');
	}
	const auth = Reflect.get(instance, 'authenticate');
	if (typeof auth === 'function') info.authenticate = 'function';
	else if (isGenericAuthenticate(auth)) info.authenticate = auth;
	if (typeof Reflect.get(instance, 'preAuthentication') === 'function') {
		info.preAuthentication = true;
	}
	const defaults: Record<string, unknown> = {};
	const properties: unknown = instance.properties;
	if (Array.isArray(properties)) {
		for (const property of properties) {
			if (!isRecord(property) || typeof property.name !== 'string') continue;
			const value = property.default;
			// Expression defaults depend on other fields. n8n resolves them; the tool does not.
			if (value === undefined || (typeof value === 'string' && value.startsWith('='))) continue;
			defaults[property.name] = value;
		}
	}
	info.defaults = defaults;
	return info;
}

const here = dirname(fileURLToPath(import.meta.url));

/** The node packages of this monorepo, relative to this file. */
export const DEFAULT_NODE_PACKAGES = [
	join(here, '../../../../nodes-base'),
	join(here, '../../../nodes-langchain'),
];

export interface LoadResult {
	types: CredentialTypeInfo[];
	/** Credential types that failed to load, with the error message. */
	failures: Array<{ name: string; error: string }>;
}

/**
 * Loads every credential type that a built node package lists in
 * `dist/known/credentials.json`. A package that is not built is skipped.
 */
export function loadCredentialTypes(packageDirs: string[] = DEFAULT_NODE_PACKAGES): LoadResult {
	const types: CredentialTypeInfo[] = [];
	const failures: Array<{ name: string; error: string }> = [];
	const seen = new Set<string>();
	for (const dir of packageDirs) {
		const indexFile = join(dir, 'dist/known/credentials.json');
		if (!existsSync(indexFile)) continue;
		const index: unknown = JSON.parse(readFileSync(indexFile, 'utf8'));
		if (!isRecord(index)) continue;
		const packageName = readPackageName(dir);
		const require = createRequire(join(dir, 'package.json'));
		for (const [name, entry] of Object.entries(index)) {
			if (seen.has(name) || !isRecord(entry)) continue;
			const { className, sourcePath } = entry;
			if (typeof className !== 'string' || typeof sourcePath !== 'string') continue;
			try {
				const exported: unknown = require(join(dir, sourcePath));
				const ctor: unknown = isRecord(exported) ? exported[className] : undefined;
				if (typeof ctor !== 'function') throw new Error(`no class ${className}`);
				types.push(describeCredentialType(Reflect.construct(ctor, []), packageName));
				seen.add(name);
			} catch (error) {
				failures.push({ name, error: error instanceof Error ? error.message : String(error) });
			}
		}
	}
	return { types, failures };
}

function readPackageName(dir: string): string {
	try {
		const pkg: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
		return isRecord(pkg) && typeof pkg.name === 'string' ? pkg.name : dir;
	} catch {
		return dir;
	}
}
