/**
 * Generates the files in `spec/` that come from other sources: one OpenRPC document per world
 * of `spec/wit` (`spec/<kind>.openrpc.json`) and `spec/manifest.schema.json` from the
 * manifest schemas of `src/manifest.ts`. The WIT parser reads the subset of WIT that the spec
 * uses. `--check` writes nothing. It fails when a file is not current, when `wasm-tools
 * component wit` refuses a WIT file, or when the functions that `wasm-tools` reads differ
 * from the functions of the parser.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestJsonSchema } from '../src/manifest';

export const SPEC_DIR = path.resolve(__dirname, '..', 'spec');

export type WitType =
	| { readonly kind: 'name'; readonly name: string }
	| { readonly kind: 'list' | 'option'; readonly of: WitType }
	| { readonly kind: 'result'; readonly ok?: WitType; readonly error?: WitType }
	| { readonly kind: 'tuple'; readonly of: readonly WitType[] }
	| { readonly kind: 'handle'; readonly name: string; readonly borrow: boolean };

/** `@since` and `@unstable` of an item. */
export interface Gate {
	readonly since?: string;
	readonly unstable?: string;
}

export interface WitParam {
	readonly name: string;
	readonly type: WitType;
}

export interface WitFunc extends Gate {
	readonly name: string;
	readonly kind: 'func' | 'method' | 'static' | 'constructor';
	readonly params: readonly WitParam[];
	readonly result?: WitType;
	readonly docs: string;
}

export interface WitCase {
	readonly name: string;
	readonly type?: WitType;
	readonly docs: string;
}

export type WitTypeDef = Gate & { readonly name: string; readonly docs: string } & (
		| { readonly kind: 'record'; readonly fields: ReadonlyArray<WitParam & { docs: string }> }
		| { readonly kind: 'variant' | 'enum'; readonly cases: readonly WitCase[] }
		| { readonly kind: 'alias'; readonly type: WitType }
		| { readonly kind: 'resource'; readonly funcs: readonly WitFunc[] }
	);

export interface WitUse {
	readonly from: string;
	readonly names: ReadonlyArray<{ readonly name: string; readonly as: string }>;
}

export interface WitInterface extends Gate {
	readonly name: string;
	readonly docs: string;
	readonly types: readonly WitTypeDef[];
	readonly funcs: readonly WitFunc[];
	readonly uses: readonly WitUse[];
}

/** An import or export of a world: an interface of the package, or a function. */
export type WitWorldItem = Gate & { readonly name: string } & (
		| { readonly interface: string; readonly func?: never }
		| { readonly func: WitFunc; readonly interface?: never }
	);

export interface WitWorld extends Gate {
	readonly name: string;
	readonly docs: string;
	readonly imports: readonly WitWorldItem[];
	readonly exports: readonly WitWorldItem[];
}

export interface WitPackage {
	readonly name: string;
	readonly version: string;
	readonly interfaces: readonly WitInterface[];
	readonly worlds: readonly WitWorld[];
}

interface Token {
	readonly text: string;
	/** The `///` lines before the token. */
	readonly docs: string;
	readonly line: number;
}

function tokenize(source: string, file: string): Token[] {
	const pattern =
		/(\/\/\/[^\n]*)|(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(\s+)|(%?[a-zA-Z][a-zA-Z0-9-]*)|([0-9][0-9a-zA-Z.+-]*)|(->|[{}()<>,:;.=@/*_])|(.)/gy;
	const matches = [...source.matchAll(pattern)];
	const lineAt = (index: number) => source.slice(0, index).split('\n').length;
	const bad = matches.find((match) => match[8] !== undefined);
	if (bad) throw new Error(`${file}:${lineAt(bad.index)}: unexpected "${bad[8]}"`);
	return matches.reduce<{ tokens: Token[]; docs: string[] }>(
		({ tokens, docs }, match) => {
			const [text, doc, line, block, space] = match;
			if (doc !== undefined) return { tokens, docs: [...docs, doc.slice(3).trim()] };
			if (line !== undefined || block !== undefined) return { tokens, docs };
			// An empty line ends a doc comment that belongs to no item.
			if (space !== undefined) return { tokens, docs: /\n\s*\n/.test(space) ? [] : docs };
			return {
				tokens: [...tokens, { text, docs: docs.join('\n'), line: lineAt(match.index) }],
				docs: [],
			};
		},
		{ tokens: [], docs: [] },
	).tokens;
}

const unescape = (name: string) => name.replace(/^%/, '');

/** A recursive descent parser over the tokens of one file. */
function parseFile(source: string, file: string) {
	const tokens = tokenize(source, file);
	const cursor = { at: 0 };
	const peek = (offset = 0) => tokens[cursor.at + offset]?.text;
	const fail = (expected: string): never => {
		const token = tokens[cursor.at];
		throw new Error(
			`${file}:${token?.line ?? 'end'}: expected ${expected}, found "${token?.text ?? 'end of file'}"`,
		);
	};
	const next = () => {
		const token = tokens[cursor.at];
		if (!token) return fail('a token');
		cursor.at += 1;
		return token;
	};
	const expect = (text: string) => (peek() === text ? next() : fail(`"${text}"`));
	const name = () => {
		const token = next();
		if (!/^%?[a-zA-Z]/.test(token.text)) {
			cursor.at -= 1;
			return fail('a name');
		}
		return unescape(token.text);
	};
	const accept = (text: string) => (peek() === text ? (next(), true) : false);

	function gate(): Gate {
		if (peek() !== '@') return {};
		next();
		const kind = name();
		expect('(');
		const key = name();
		expect('=');
		const value = next().text;
		expect(')');
		const rest = gate();
		if (kind === 'since' && key === 'version') return { ...rest, since: value };
		if (kind === 'unstable' && key === 'feature') return { ...rest, unstable: value };
		if (kind === 'deprecated') return rest;
		return fail('@since, @unstable or @deprecated');
	}

	function type(): WitType {
		const head = name();
		const generic = (count: number) => {
			expect('<');
			const types = [type(), ...Array.from({ length: count - 1 }, () => (expect(','), type()))];
			expect('>');
			return types;
		};
		if (head === 'list' || head === 'option') {
			const [of = fail('a type')] = generic(1);
			return { kind: head, of };
		}
		if (head === 'borrow' || head === 'own') {
			expect('<');
			const resource = name();
			expect('>');
			return { kind: 'handle', name: resource, borrow: head === 'borrow' };
		}
		if (head === 'tuple') {
			expect('<');
			const of = [type()];
			while (accept(',')) of.push(type());
			expect('>');
			return { kind: 'tuple', of };
		}
		if (head === 'result') {
			if (!accept('<')) return { kind: 'result' };
			const ok = accept('_') ? undefined : type();
			const error = accept(',') ? type() : undefined;
			expect('>');
			return { kind: 'result', ...(ok ? { ok } : {}), ...(error ? { error } : {}) };
		}
		return { kind: 'name', name: head };
	}

	function params(): WitParam[] {
		expect('(');
		const list: WitParam[] = [];
		while (peek() !== ')') {
			const param = name();
			expect(':');
			list.push({ name: param, type: type() });
			if (!accept(',')) break;
		}
		expect(')');
		return list;
	}

	/** `func(…) -> T` after the name and the colon. */
	function signature(funcName: string, docs: string, gated: Gate, kind: WitFunc['kind']): WitFunc {
		const list = params();
		const result = accept('->') ? type() : undefined;
		expect(';');
		return { ...gated, name: funcName, kind, params: list, ...(result ? { result } : {}), docs };
	}

	function resourceBody(): WitFunc[] {
		if (accept(';')) return [];
		expect('{');
		const funcs: WitFunc[] = [];
		while (peek() !== '}') {
			const docs = tokens[cursor.at]?.docs ?? '';
			const gated = gate();
			if (accept('constructor')) {
				funcs.push(signature('constructor', docs, gated, 'constructor'));
				continue;
			}
			const funcName = name();
			expect(':');
			const isStatic = accept('static');
			expect('func');
			funcs.push(signature(funcName, docs, gated, isStatic ? 'static' : 'method'));
		}
		expect('}');
		return funcs;
	}

	function cases(withTypes: boolean): WitCase[] {
		expect('{');
		const list: WitCase[] = [];
		while (peek() !== '}') {
			const docs = tokens[cursor.at]?.docs ?? '';
			const caseName = name();
			const caseType = withTypes && accept('(') ? type() : undefined;
			if (caseType) expect(')');
			list.push({ name: caseName, docs, ...(caseType ? { type: caseType } : {}) });
			if (!accept(',')) break;
		}
		expect('}');
		return list;
	}

	function use(): WitUse {
		const from = name();
		expect('.');
		expect('{');
		const names: Array<{ name: string; as: string }> = [];
		while (peek() !== '}') {
			const used = name();
			names.push({ name: used, as: accept('as') ? name() : used });
			if (!accept(',')) break;
		}
		expect('}');
		expect(';');
		return { from, names };
	}

	function interfaceBody(): Omit<WitInterface, 'name' | 'docs' | keyof Gate> {
		expect('{');
		const types: WitTypeDef[] = [];
		const funcs: WitFunc[] = [];
		const uses: WitUse[] = [];
		while (peek() !== '}') {
			const docs = tokens[cursor.at]?.docs ?? '';
			const gated = gate();
			const keyword = peek();
			if (keyword === 'use') {
				next();
				uses.push(use());
			} else if (keyword === 'record') {
				next();
				const typeName = name();
				expect('{');
				const fields: Array<WitParam & { docs: string }> = [];
				while (peek() !== '}') {
					const fieldDocs = tokens[cursor.at]?.docs ?? '';
					const field = name();
					expect(':');
					fields.push({ name: field, type: type(), docs: fieldDocs });
					if (!accept(',')) break;
				}
				expect('}');
				types.push({ ...gated, kind: 'record', name: typeName, docs, fields });
			} else if (keyword === 'variant' || keyword === 'enum') {
				next();
				const typeName = name();
				types.push({
					...gated,
					kind: keyword,
					name: typeName,
					docs,
					cases: cases(keyword === 'variant'),
				});
			} else if (keyword === 'type') {
				next();
				const typeName = name();
				expect('=');
				const aliased = type();
				expect(';');
				types.push({ ...gated, kind: 'alias', name: typeName, docs, type: aliased });
			} else if (keyword === 'resource') {
				next();
				const typeName = name();
				types.push({ ...gated, kind: 'resource', name: typeName, docs, funcs: resourceBody() });
			} else {
				const funcName = name();
				expect(':');
				expect('func');
				funcs.push(signature(funcName, docs, gated, 'func'));
			}
		}
		expect('}');
		return { types, funcs, uses };
	}

	function worldBody(): Pick<WitWorld, 'imports' | 'exports'> {
		expect('{');
		const imports: WitWorldItem[] = [];
		const exports: WitWorldItem[] = [];
		while (peek() !== '}') {
			const docs = tokens[cursor.at]?.docs ?? '';
			const gated = gate();
			const keyword = next().text;
			if (keyword === 'use') {
				use();
				continue;
			}
			if (keyword !== 'import' && keyword !== 'export') return fail('import, export or use');
			const itemName = name();
			const item: WitWorldItem = accept(':')
				? (expect('func'),
					{ ...gated, name: itemName, func: signature(itemName, docs, gated, 'func') })
				: (expect(';'), { ...gated, name: itemName, interface: itemName });
			(keyword === 'import' ? imports : exports).push(item);
		}
		expect('}');
		return { imports, exports };
	}

	const header = { name: '', version: '' };
	const interfaces: WitInterface[] = [];
	const worlds: WitWorld[] = [];
	while (cursor.at < tokens.length) {
		const docs = tokens[cursor.at]?.docs ?? '';
		const gated = gate();
		const keyword = next().text;
		if (keyword === 'package') {
			const namespace = name();
			expect(':');
			header.name = `${namespace}:${name()}`;
			header.version = accept('@') ? next().text : '';
			expect(';');
		} else if (keyword === 'interface') {
			interfaces.push({ ...gated, name: name(), docs, ...interfaceBody() });
		} else if (keyword === 'world') {
			worlds.push({ ...gated, name: name(), docs, ...worldBody() });
		} else {
			cursor.at -= 1;
			fail('package, interface or world');
		}
	}
	return { ...header, interfaces, worlds };
}

/** Parses the files of one WIT package. Each file must name the same package. */
export function parseWit(files: ReadonlyArray<{ readonly file: string; readonly source: string }>) {
	const parsed = files.map(({ file, source }) => ({ file, ...parseFile(source, file) }));
	const [first] = parsed;
	const other = parsed.find(
		({ name, version }) => name !== first?.name || version !== first?.version,
	);
	if (!first || other) throw new Error(`${other?.file ?? 'WIT'}: not the package of the others`);
	const pkg: WitPackage = {
		name: first.name,
		version: first.version,
		interfaces: parsed.flatMap(({ interfaces }) => interfaces),
		worlds: parsed.flatMap(({ worlds }) => worlds),
	};
	const names = [...pkg.interfaces, ...pkg.worlds].map(({ name }) => name);
	const repeated = names.find((name, index) => names.indexOf(name) !== index);
	if (repeated) throw new Error(`${pkg.name}: two items are named ${repeated}`);
	return pkg;
}

/** A `.wit` file, or a folder that holds one package. */
export function readWit(relative: string): WitPackage {
	const at = path.join(SPEC_DIR, relative);
	const files = relative.endsWith('.wit')
		? [at]
		: readdirSync(at)
				.filter((file) => file.endsWith('.wit'))
				.sort()
				.map((file) => path.join(at, file));
	return parseWit(
		files.map((file) => ({
			file: path.relative(SPEC_DIR, file),
			source: readFileSync(file, 'utf8'),
		})),
	);
}

/** `timeout-ms` → `timeoutMs`. JSON-RPC data names are lower camel case. */
export const camelCase = (name: string) =>
	name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());

const semverParts = (text: string) => text.split('.').map(Number);

const newest = (...versions: Array<string | undefined>) =>
	versions
		.filter((version): version is string => version !== undefined)
		.reduce<string | undefined>((best, version) => {
			if (best === undefined) return version;
			const [a, b] = [semverParts(best), semverParts(version)];
			const order = a.reduce((found, part, index) => found || part - (b[index] ?? 0), 0);
			return order < 0 ? version : best;
		}, undefined);

type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
type JsonObject = { readonly [key: string]: Json };

const MAX_SAFE_INTEGER = 2 ** 53 - 1;

const INTEGERS: Readonly<Record<string, JsonObject>> = {
	u8: { type: 'integer', minimum: 0, maximum: 255 },
	u16: { type: 'integer', minimum: 0, maximum: 65535 },
	u32: { type: 'integer', minimum: 0, maximum: 4294967295 },
	u64: { type: 'integer', minimum: 0, maximum: MAX_SAFE_INTEGER },
	s8: { type: 'integer', minimum: -128, maximum: 127 },
	s16: { type: 'integer', minimum: -32768, maximum: 32767 },
	s32: { type: 'integer', minimum: -2147483648, maximum: 2147483647 },
	s64: { type: 'integer', minimum: -MAX_SAFE_INTEGER, maximum: MAX_SAFE_INTEGER },
};

const PRIMITIVES: ReadonlyMap<string, JsonObject> = new Map([
	...Object.entries(INTEGERS),
	['bool', { type: 'boolean' }],
	['f32', { type: 'number' }],
	['f64', { type: 'number' }],
	['char', { type: 'string', minLength: 1, maxLength: 2 }],
	['string', { type: 'string' }],
]);

/** The JSON value alias of `types`: it crosses as the value, not as its text. */
const JSON_VALUE = 'types.json';

const JSON_VALUE_SCHEMA: JsonObject = { description: 'A JSON value, inline.' };

export interface RpcMethod {
	readonly name: string;
	readonly direction: 'host-to-guest' | 'guest-to-host';
	readonly since: string;
	readonly unstable?: string;
	readonly description?: string;
	readonly params: ReadonlyArray<{
		readonly name: string;
		readonly required: boolean;
		readonly schema: JsonObject;
	}>;
	/** None for a notification. */
	readonly result?: JsonObject;
	readonly error?: JsonObject;
}

/** Resolves the names of one package: interfaces, their types, and the types they use. */
function resolverOf(pkg: WitPackage) {
	const interfaceOf = (name: string) => {
		const found = pkg.interfaces.find((candidate) => candidate.name === name);
		if (!found) throw new Error(`${pkg.name} has no interface ${name}`);
		return found;
	};
	/** `iface.type` of a type name used in `iface`, after `use` aliases. */
	const definitionOf = (iface: string, typeName: string): { at: string; def: WitTypeDef } => {
		const owner = interfaceOf(iface);
		const local = owner.types.find(({ name }) => name === typeName);
		if (local) return { at: `${iface}.${typeName}`, def: local };
		const used = owner.uses.flatMap(({ from, names }) =>
			names.filter(({ as }) => as === typeName).map(({ name }) => ({ from, name })),
		)[0];
		if (!used) throw new Error(`${iface} uses an unknown type ${typeName}`);
		return definitionOf(used.from, used.name);
	};
	return { interfaceOf, definitionOf };
}

/** The OpenRPC methods and component schemas of one world, by the mapping of `json-rpc.md`. */
export function rpcOf(pkg: WitPackage, worldName: string) {
	const { interfaceOf, definitionOf } = resolverOf(pkg);
	const found = pkg.worlds.find(({ name }) => name === worldName);
	if (!found) throw new Error(`${pkg.name} has no world ${worldName}`);
	const world: WitWorld = found;
	const schemas = new Map<string, JsonObject>();

	const handleSchema = (at: string): JsonObject => ({
		type: 'integer',
		minimum: 0,
		description: `A handle of ${at}. The side that creates the resource numbers it.`,
	});

	function schemaOf(iface: string, witType: WitType): JsonObject {
		if (witType.kind === 'name') {
			const primitive = PRIMITIVES.get(witType.name);
			if (primitive) return primitive;
			const { at, def } = definitionOf(iface, witType.name);
			if (at === JSON_VALUE) return { $ref: `#/components/schemas/${JSON_VALUE}` };
			if (def.kind === 'resource') return handleSchema(at);
			if (!schemas.has(at)) {
				schemas.set(at, definitionSchema(at.split('.')[0] ?? iface, def));
			}
			return { $ref: `#/components/schemas/${at}` };
		}
		if (witType.kind === 'handle') return handleSchema(definitionOf(iface, witType.name).at);
		if (witType.kind === 'list') {
			const item = witType.of;
			if (item.kind === 'name' && item.name === 'u8') {
				return { type: 'string', contentEncoding: 'base64' };
			}
			return { type: 'array', items: schemaOf(iface, item) };
		}
		if (witType.kind === 'tuple') {
			return {
				type: 'array',
				items: witType.of.map((item) => schemaOf(iface, item)),
				minItems: witType.of.length,
				maxItems: witType.of.length,
				additionalItems: false,
			};
		}
		if (witType.kind === 'option') return optionSchema(iface, witType.of);
		throw new Error(`${iface}: a result is only allowed as the result of a function`);
	}

	/** A JSON value can be `null`, so its option wraps the value in `some`. */
	function optionSchema(iface: string, of: WitType): JsonObject {
		const value = schemaOf(iface, of);
		const isJson = of.kind === 'name' && value.$ref === `#/components/schemas/${JSON_VALUE}`;
		const some: JsonObject = isJson
			? {
					type: 'object',
					properties: { some: value },
					required: ['some'],
					additionalProperties: false,
				}
			: value;
		return { oneOf: [some, { type: 'null' }] };
	}

	/** In a record and in parameters, a none field is left out, so its schema is the value. */
	const fieldSchema = (iface: string, witType: WitType) =>
		witType.kind === 'option' ? schemaOf(iface, witType.of) : schemaOf(iface, witType);

	const described = (schema: JsonObject, docs: string, gated: Gate = {}): JsonObject => ({
		...(docs ? { description: docs } : {}),
		...(gated.since ? { 'x-since': gated.since } : {}),
		...(gated.unstable ? { 'x-unstable': gated.unstable } : {}),
		...schema,
	});

	function definitionSchema(iface: string, def: WitTypeDef): JsonObject {
		if (def.kind === 'record') {
			const required = def.fields.filter(({ type }) => type.kind !== 'option');
			return described(
				{
					type: 'object',
					properties: Object.fromEntries(
						def.fields.map((field) => [
							camelCase(field.name),
							described(fieldSchema(iface, field.type), field.docs),
						]),
					),
					...(required.length ? { required: required.map(({ name }) => camelCase(name)) } : {}),
					additionalProperties: false,
				},
				def.docs,
				def,
			);
		}
		if (def.kind === 'enum') {
			return described({ enum: def.cases.map(({ name }) => camelCase(name)) }, def.docs, def);
		}
		if (def.kind === 'variant') {
			return described(
				{
					oneOf: def.cases.map((entry) =>
						described(
							{
								type: 'object',
								properties: {
									tag: { const: camelCase(entry.name) },
									...(entry.type ? { val: schemaOf(iface, entry.type) } : {}),
								},
								required: entry.type ? ['tag', 'val'] : ['tag'],
								additionalProperties: false,
							},
							entry.docs,
						),
					),
				},
				def.docs,
				def,
			);
		}
		if (def.kind === 'alias') return described(schemaOf(iface, def.type), def.docs, def);
		throw new Error(`${iface}.${def.name}: a resource has no JSON form, only a handle`);
	}

	function methodOf(
		iface: string,
		func: WitFunc,
		methodName: string,
		direction: RpcMethod['direction'],
		since: string,
		self?: string,
	): RpcMethod {
		const unstable = func.unstable;
		const result = func.result;
		const params = [
			...(self ? [{ name: 'self', required: true, schema: handleSchema(self) }] : []),
			...func.params.map(({ name, type }) => ({
				name: camelCase(name),
				required: type.kind !== 'option',
				schema: fieldSchema(iface, type),
			})),
		];
		const ok =
			func.kind === 'constructor'
				? handleSchema(self ?? iface)
				: result?.kind === 'result'
					? result.ok
						? schemaOf(iface, result.ok)
						: { type: 'null' }
					: result
						? schemaOf(iface, result)
						: undefined;
		const error =
			result?.kind === 'result'
				? result.error
					? schemaOf(iface, result.error)
					: { type: 'null' }
				: undefined;
		return {
			name: methodName,
			direction,
			since: newest(since, func.since) ?? since,
			...(unstable ? { unstable } : {}),
			...(func.docs ? { description: func.docs } : {}),
			params: func.kind === 'constructor' ? params.filter(({ name }) => name !== 'self') : params,
			...(ok ? { result: ok } : {}),
			...(error ? { error } : {}),
		};
	}

	/** The interfaces a world gets: its items, and each interface that they use, as an import. */
	const sides = (() => {
		const exported = new Map(
			world.exports.flatMap((item) => (item.interface ? [[item.interface, item] as const] : [])),
		);
		const imported = new Map<string, Gate>();
		const visit = (name: string, gated: Gate) => {
			const owner = interfaceOf(name);
			owner.uses.forEach(({ from }) => {
				if (exported.has(from) || imported.has(from)) return;
				imported.set(from, gated);
				visit(from, gated);
			});
		};
		world.imports.forEach((item) => {
			if (!item.interface || imported.has(item.interface)) return;
			imported.set(item.interface, item);
			visit(item.interface, item);
		});
		exported.forEach((item, name) => visit(name, item));
		return { exported, imported };
	})();

	function methodsOf(name: string, gated: Gate, direction: RpcMethod['direction']): RpcMethod[] {
		const owner = interfaceOf(name);
		const since = newest(world.since, owner.since, gated.since) ?? pkg.version;
		const unstable = gated.unstable ?? owner.unstable ?? world.unstable;
		const withGate = (method: RpcMethod): RpcMethod =>
			unstable && !method.unstable ? { ...method, unstable } : method;
		const funcs = owner.funcs.map((func) =>
			methodOf(name, func, `${name}.${func.name}`, direction, since),
		);
		const resources = owner.types.flatMap((def) => {
			if (def.kind !== 'resource') return [];
			const at = `${name}.${def.name}`;
			const resourceSince = newest(since, def.since) ?? since;
			const methods = def.funcs.map((func) =>
				methodOf(
					name,
					func,
					`${at}.${func.kind === 'constructor' ? '[new]' : func.name}`,
					direction,
					resourceSince,
					func.kind === 'method' || func.kind === 'constructor' ? at : undefined,
				),
			);
			const drop: RpcMethod = {
				name: `${at}.[drop]`,
				direction,
				since: resourceSince,
				...(def.unstable ? { unstable: def.unstable } : {}),
				description: 'Frees an owned handle. A notification: it has no answer.',
				params: [{ name: 'self', required: true, schema: handleSchema(at) }],
			};
			const nextMethod = methods.find(({ name: method }) => method === `${at}.next`);
			const nextResult = def.funcs.find((func) => func.name === 'next')?.result;
			// In a list, a JSON value needs no `some`: the end of the run is not an entry.
			const output =
				nextResult?.kind === 'result' && nextResult.ok?.kind === 'option'
					? schemaOf(name, nextResult.ok.of)
					: undefined;
			const take: RpcMethod[] =
				nextMethod && output
					? [
							{
								...nextMethod,
								name: `${at}.[take]`,
								description:
									'Calls `next` until the end, an error, or `max` outputs, in one round trip. The guest can call the host in between. The outputs before an error stay in `outputs`.',
								params: [
									...nextMethod.params,
									{ name: 'max', required: true, schema: INTEGERS.u32 ?? {} },
								],
								result: {
									type: 'object',
									properties: {
										outputs: { type: 'array', items: output },
										done: { type: 'boolean' },
										...(nextMethod.error ? { error: nextMethod.error } : {}),
									},
									required: ['outputs', 'done'],
									additionalProperties: false,
								},
								error: undefined,
							},
						]
					: [];
			return [...methods, drop, ...take];
		});
		return [...funcs, ...resources].map(withGate);
	}

	const methods = [
		...[...sides.exported].flatMap(([name, gated]) => methodsOf(name, gated, 'host-to-guest')),
		...[...sides.imported].flatMap(([name, gated]) => methodsOf(name, gated, 'guest-to-host')),
	];
	return { world, methods, schemas };
}

const kindOf = (worldName: string) => worldName.replace(/-bundle$/, '');

/** The OpenRPC 1.3 document of one world. */
export function openRpcOf(pkg: WitPackage, worldName: string): JsonObject {
	const { world, methods, schemas } = rpcOf(pkg, worldName);
	const kind = kindOf(worldName);
	const initialize: RpcMethod = {
		name: '[initialize]',
		direction: 'host-to-guest',
		since: newest(world.since) ?? pkg.version,
		...(world.unstable ? { unstable: world.unstable } : {}),
		description:
			'The first message. The host sends the Node Contract version that it implements. The guest answers with the version and the kind of its bundle. The host closes the connection when the bundle version is outside its range or needs a newer minor.',
		params: [{ name: 'nodeContract', required: true, schema: { type: 'string' } }],
		result: {
			type: 'object',
			properties: { nodeContract: { type: 'string' }, kind: { const: kind } },
			required: ['nodeContract', 'kind'],
			additionalProperties: false,
		},
	};
	const toMethod = (method: RpcMethod): JsonObject => ({
		name: method.name,
		...(method.description ? { description: method.description } : {}),
		paramStructure: 'by-name',
		params: method.params.map(({ name, required, schema }) => ({ name, required, schema })),
		...(method.result ? { result: { name: 'result', schema: method.result } } : {}),
		...(method.error
			? { errors: [{ code: -32000, message: 'The error of the WIT result.' }] }
			: {}),
		...(method.error ? { 'x-error': method.error } : {}),
		'x-direction': method.direction,
		// An unstable item has no version yet.
		...(method.unstable ? { 'x-unstable': method.unstable } : { 'x-since': method.since }),
	});
	return {
		openrpc: '1.3.2',
		info: {
			title: `n8n Node Contract: the ${kind} interface`,
			version: pkg.version,
			description: [
				`Generated from spec/wit (world ${worldName}) by scripts/spec.ts. Do not edit.`,
				world.docs,
				'Both sides send requests on one connection. `x-direction` tells which side answers a method. A method without `result` is a notification. Names in brackets are not WIT functions: the JSON-RPC mapping adds them.',
			]
				.filter(Boolean)
				.join('\n\n'),
		},
		'x-world': `${pkg.name}/${worldName}@${pkg.version}`,
		...(world.unstable
			? { 'x-unstable': world.unstable }
			: { 'x-since': world.since ?? pkg.version }),
		methods: [initialize, ...methods].map(toMethod),
		components: {
			schemas: Object.fromEntries([
				[JSON_VALUE, JSON_VALUE_SCHEMA] as const,
				...[...schemas].sort(([a], [b]) => a.localeCompare(b)),
			]),
		},
	};
}

/** The node-contract package, with each world. */
export const NODE_CONTRACT_WIT = 'wit';

/** Every generated file of `spec/`, by its path relative to `spec/`. */
export function generatedSpecFiles(): ReadonlyMap<string, string> {
	const pkg = readWit(NODE_CONTRACT_WIT);
	const text = (value: unknown) => `${JSON.stringify(value, null, '\t')}\n`;
	return new Map([
		...pkg.worlds.map(
			(world) => [`${kindOf(world.name)}.openrpc.json`, text(openRpcOf(pkg, world.name))] as const,
		),
		['manifest.schema.json', text(manifestJsonSchema(pkg.version))],
	]);
}

const readOrNone = (file: string) => {
	try {
		return readFileSync(file, 'utf8');
	} catch {
		return undefined;
	}
};

/** The generated files whose content differs from the file in `spec/`. */
export const staleSpecFiles = () =>
	[...generatedSpecFiles()].filter(
		([file, content]) => readOrNone(path.join(SPEC_DIR, file)) !== content,
	);

const signature = (name: string, params: ReadonlyArray<{ readonly name: string }>) =>
	`${name}(${params.map((param) => param.name).join(', ')})`;

/** The canonical ABI names of the functions of each interface, e.g. `[method]table.rows(query)`. */
export const functionsOf = (pkg: WitPackage) =>
	Object.fromEntries(
		pkg.interfaces.map((owner) => [
			owner.name,
			[
				...owner.funcs.map((func) => signature(func.name, func.params)),
				...owner.types.flatMap((def) =>
					def.kind === 'resource'
						? def.funcs.map((func) =>
								signature(
									func.kind === 'constructor'
										? `[constructor]${def.name}`
										: `[${func.kind}]${def.name}.${func.name}`,
									func.params,
								),
							)
						: [],
				),
			].sort(),
		]),
	);

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The same names from the JSON of `wasm-tools component wit --json`. */
function wasmToolsFunctionsOf(json: unknown) {
	const interfaces = isObject(json) && Array.isArray(json.interfaces) ? json.interfaces : [];
	return Object.fromEntries(
		interfaces.filter(isObject).flatMap(({ name, functions }) => {
			if (typeof name !== 'string' || !isObject(functions)) return [];
			const signatures = Object.entries(functions).map(([key, func]) => {
				const params = isObject(func) && Array.isArray(func.params) ? func.params : [];
				const names = params.flatMap((param) =>
					isObject(param) && typeof param.name === 'string' ? [{ name: param.name }] : [],
				);
				// A method gets its handle as `self`; the WIT text does not name it.
				return signature(key, key.startsWith('[method]') ? names.slice(1) : names);
			});
			return [[name, signatures.sort()]];
		}),
	);
}

/** The problems that `wasm-tools` finds in the WIT files. */
export function wasmToolsProblems(): string[] {
	const run = (args: string[]) =>
		execFileSync('wasm-tools', ['component', 'wit', ...args], {
			cwd: SPEC_DIR,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	try {
		run([NODE_CONTRACT_WIT]);
		run(['n8n-action@1.wit']);
		const resolved: unknown = JSON.parse(run(['--all-features', '--json', NODE_CONTRACT_WIT]));
		const text = (byInterface: Record<string, unknown>) =>
			JSON.stringify(Object.entries(byInterface).sort(([a], [b]) => a.localeCompare(b)));
		const theirs = text(wasmToolsFunctionsOf(resolved));
		const ours = text(functionsOf(readWit(NODE_CONTRACT_WIT)));
		return theirs === ours
			? []
			: [`wasm-tools reads other functions than scripts/spec.ts:\n${theirs}\n${ours}`];
	} catch (error) {
		const code = isObject(error) ? error.code : undefined;
		if (code === 'ENOENT')
			return ['wasm-tools is not installed: cargo install --locked wasm-tools'];
		const stderr = isObject(error) ? error.stderr : undefined;
		return [typeof stderr === 'string' && stderr ? stderr : String(error)];
	}
}

if (require.main === module) {
	const stale = staleSpecFiles();
	if (process.argv.includes('--check')) {
		const problems = [
			...(stale.length
				? [`Not current, run \`pnpm spec:generate\`: ${stale.map(([file]) => file).join(', ')}`]
				: []),
			...wasmToolsProblems(),
		];
		problems.forEach((problem) => console.error(problem));
		process.exitCode = problems.length ? 1 : 0;
	} else {
		stale.forEach(([file, content]) => writeFileSync(path.join(SPEC_DIR, file), content));
	}
}
