import Ajv2020 from 'ajv/dist/2020';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { INodeType, WebhookSetupMethodNames } from 'n8n-workflow';

import {
	camelCase,
	readWit,
	rpcOf,
	staleSpecFiles,
	type WitPackage,
	type WitTypeDef,
} from '../../scripts/spec';
import type { CustomAuth } from '../credentials';
import type {
	ActionBinding,
	ActionFlow,
	BatchContext,
	CodeRequest,
	DataTable,
	DataTableColumn,
	DataTableColumnType,
	DataTableCondition,
	DataTableFilter,
	DataTableInfo,
	DataTableListQuery,
	DataTableOperator,
	DataTableQuery,
	DataTables,
	Emit,
	HostImports,
	Http,
	HttpError,
	HttpMethod,
	HttpRequest,
	LogLevel,
	RunContext,
	RunHost,
	RunLimits,
	Wait,
	CodeRunner,
} from '../define';
import {
	credentialManifestSchema,
	nativeManifestSchema,
	versionManifestSchema,
	type CredentialManifest,
	type NativeManifest,
} from '../manifest';
import type { AnySchema, BinaryMeta, JsonSchema, Shape } from '../schema';
import {
	PROVIDER_CONNECTIONS,
	type ChatModel,
	type ChatReply,
	type ChatRequest,
	type ChatUsage,
	type Embeddings,
	type Memory,
	type ProviderCapabilities,
	type ProviderKind,
	type Tool,
	type ToolCall,
	type ToolDefinition,
} from '../providers';
import { parseStoreIndex, storeBlobFileOf } from '../store';
import { validate } from '../validator';
import { compareSemver, NODE_CONTRACT_VERSION, type VersionManifest } from '../version';

/** The keys of `T`. A missing key fails `tsc`. */
const keysOf =
	<T>() =>
	<const K extends ReadonlyArray<keyof T>>(
		keys: K,
		..._missing: [Exclude<keyof T, K[number]>] extends [never] ? [] : [never]
	) =>
		keys;

/** The members of a string union. A missing member fails `tsc`. */
const membersOf =
	<T extends string>() =>
	<const V extends readonly T[]>(
		values: V,
		..._missing: [Exclude<T, V[number]>] extends [never] ? [] : [never]
	) =>
		values;

const sorted = (values: readonly string[]) => [...values].sort();

/** The `x-n8n-*` keywords of the contract format. A missing keyword fails `tsc`. */
const N8N_KEYWORDS = keysOf<Pick<JsonSchema, Extract<keyof JsonSchema, `x-n8n-${string}`>>>()([
	'x-n8n-hint',
	'x-n8n-literal',
	'x-n8n-ref',
	'x-n8n-lookup',
	'x-n8n-passed',
	'x-n8n-value-types',
	'x-n8n-binary',
	'x-n8n-supply',
	'x-n8n-model-catalog',
	'x-n8n-declared',
	'x-n8n-entry-fields',
	'x-n8n-aggregate',
	'x-n8n-claim',
	'x-n8n-resource',
	'x-n8n-options',
	'x-n8n-base-url',
	'x-n8n-page',
	'x-n8n-since',
]);

/** The formats that the SDK validator checks. Each other format is an error here. */
const FORMATS = ['date', 'date-time', 'uri', 'email', 'uuid'];

/**
 * A JSON Schema 2020-12 validator that refuses each keyword and format it does not know. As in
 * 2020-12, a format is an annotation: the validator does not check it.
 */
const strictAjv = () =>
	new Ajv2020({
		strict: true,
		discriminator: true,
		allErrors: true,
		keywords: [...N8N_KEYWORDS],
		formats: Object.fromEntries(FORMATS.map((format) => [format, true])),
	});

interface ShippedManifest {
	kind: string;
	fields?: JsonSchema;
	contract?: { input: JsonSchema; output: JsonSchema };
	reply?: { contract: { input: JsonSchema; output: JsonSchema } };
}

const STORE_DIRS = ['nodes-core', 'nodes-integrations'].map((name) =>
	path.resolve(__dirname, '../../..', name, 'dist/store'),
);

/** Each manifest of each version in the stores that the first-party source packages build. */
const shippedManifests = () =>
	STORE_DIRS.flatMap((storeDir) =>
		readdirSync(path.join(storeDir, 'index')).flatMap((file) => {
			const id = path.basename(file, '.ndjson');
			const records = parseStoreIndex(readFileSync(path.join(storeDir, 'index', file), 'utf8'), id);
			return records.map(({ version, manifest }) => ({
				file: `${id}@${version}`,
				manifest: JSON.parse(
					readFileSync(path.join(storeDir, storeBlobFileOf(manifest)), 'utf8'),
				) as ShippedManifest,
			}));
		}),
	);

/** The parsed WIT, with lookups by name. Items newer than `implemented` stay out. */
function shapeOf(pkg: WitPackage, implemented = pkg.version) {
	const current = ({ since }: { since?: string }) =>
		since === undefined || compareSemver(since, implemented) <= 0;
	const iface = (name: string) => {
		const found = pkg.interfaces.find((candidate) => candidate.name === name);
		if (!found) throw new Error(`no interface ${name}`);
		return found;
	};
	const typeIn = (ifaceName: string, typeName: string): WitTypeDef => {
		const found = iface(ifaceName).types.find(({ name }) => name === typeName);
		if (!found) throw new Error(`no type ${ifaceName}.${typeName}`);
		return found;
	};
	const fields = (ifaceName: string, typeName: string) => {
		const def = typeIn(ifaceName, typeName);
		// TS spreads the `target` variant into its `url` and `path` keys.
		return def.kind === 'record'
			? def.fields.flatMap(({ name }) => (name === 'target' ? ['url', 'path'] : [camelCase(name)]))
			: [];
	};
	const cases = (ifaceName: string, typeName: string) => {
		const def = typeIn(ifaceName, typeName);
		return def.kind === 'enum' || def.kind === 'variant'
			? def.cases.map(({ name }) => camelCase(name))
			: [];
	};
	const funcs = (ifaceName: string) =>
		iface(ifaceName)
			.funcs.filter((func) => !func.unstable)
			.map(({ name }) => camelCase(name));
	const methods = (ifaceName: string, resource: string) => {
		const def = typeIn(ifaceName, resource);
		return def.kind === 'resource' ? def.funcs.map(({ name }) => camelCase(name)) : [];
	};
	const world = (name: string) => {
		const found = pkg.worlds.find((candidate) => candidate.name === name);
		if (!found) throw new Error(`no world ${name}`);
		return {
			imports: found.imports.filter(current).map(({ name: item }) => camelCase(item)),
			exports: found.exports.filter(current).map(({ name: item }) => camelCase(item)),
		};
	};
	return { iface, typeIn, fields, cases, funcs, methods, world };
}

// The JS shim keeps `fullResponse`: the WIT response always has status, headers, and body.
// It maps `response: 'binary'` to `binary.fetch`.
const httpRequestKeys = keysOf<HttpRequest>()([
	'method',
	'url',
	'path',
	'query',
	'headers',
	'body',
	'timeoutMs',
	'retry',
	'fullResponse',
	'response',
]).filter((key) => key !== 'fullResponse' && key !== 'response');

const httpErrorKeys = keysOf<Pick<HttpError, Exclude<keyof HttpError, keyof Error> | 'message'>>()([
	'message',
	'status',
	'headers',
	'body',
]);

const httpMethods = membersOf<HttpMethod>()(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

const pkg = readWit('wit');
const wit = shapeOf(pkg);

describe('spec/wit', () => {
	it('is the Node Contract package of the version this host implements', () => {
		expect(pkg.name).toBe('n8n:node-contract');
		expect(pkg.version).toBe(NODE_CONTRACT_VERSION);
		expect(sorted(pkg.worlds.map(({ name }) => name))).toEqual(
			sorted(['action', 'trigger', 'credential', 'provider', 'lookup'].map((k) => `${k}-bundle`)),
		);
	});

	it('gives one generated file per world and the manifest schema, each current', () => {
		const generated = readdirSync(path.resolve(__dirname, '../../spec')).filter((file) =>
			file.endsWith('.json'),
		);
		expect(sorted(generated)).toEqual(
			sorted([
				'action.openrpc.json',
				'trigger.openrpc.json',
				'credential.openrpc.json',
				'provider.openrpc.json',
				'lookup.openrpc.json',
				'manifest.schema.json',
			]),
		);
		expect(staleSpecFiles().map(([file]) => file)).toEqual([]);
	});

	it('maps each WIT function of a world to one JSON-RPC method, and each method back', () => {
		const added = /\.\[(new|drop|take)\]$|^\[initialize\]$/;
		const usedBy = (names: readonly string[]): readonly string[] => {
			const next = [
				...new Set([
					...names,
					...names.flatMap((name) => wit.iface(name).uses.map(({ from }) => from)),
				]),
			];
			return next.length === names.length ? names : usedBy(next);
		};
		pkg.worlds.forEach((world) => {
			const names = rpcOf(pkg, world.name).methods.map((method) => method.name);
			expect(new Set(names).size).toBe(names.length);
			const items = [...world.imports, ...world.exports].flatMap((item) =>
				item.interface ? [item.interface] : [],
			);
			const fromWit = usedBy(items).flatMap((name) => {
				const owner = wit.iface(name);
				return [
					...owner.funcs.map((func) => `${name}.${func.name}`),
					...owner.types.flatMap((def) =>
						def.kind === 'resource'
							? [
									...def.funcs
										.filter((func) => func.kind !== 'constructor')
										.map((func) => `${name}.${def.name}.${func.name}`),
									`${name}.${def.name}.[drop]`,
								]
							: [],
					),
				];
			});
			expect(
				sorted(names.filter((method) => !added.test(method) || method.endsWith('.[drop]'))),
			).toEqual(sorted(fromWit));
		});
	});
});

describe('the action interface', () => {
	const action = wit.world('action-bundle');

	it('has one run context field per host import, plus input and the items of the run', () => {
		const context = keysOf<RunContext<unknown>>()([
			'input',
			'item',
			'http',
			'log',
			'limits',
			'binary',
		]);
		const batch = keysOf<BatchContext<unknown>>()([
			'input',
			'items',
			'http',
			'log',
			'limits',
			'binary',
		]);
		// An action gets an optional import only when its manifest lists it. A provider capability
		// comes in the input, at a `provider.input()` field.
		const optional = keysOf<HostImports<unknown>>()([
			'dataTables',
			'parsers',
			'code',
			'wait',
			'inputOf',
		]);
		type Bound = Extract<
			ActionBinding<Shape, AnySchema, ActionFlow, string, undefined>,
			{ run: unknown }
		>;
		const credential = keysOf<Pick<Parameters<Bound['run']>[0], 'credential'>>()(['credential']);
		// `chunk` names the item of a chunk-run to the host, and `schema` serves `validate`;
		// `run()` never sees them.
		const imports = action.imports
			.filter((name) => name !== 'chunk' && name !== 'schema')
			.map((name) => (name === 'runCredential' ? 'credential' : name));
		expect(sorted(['input', 'item', ...imports])).toEqual(
			sorted([...context, ...optional, ...credential, 'supplied']),
		);
		expect(sorted(['input', 'items', ...imports])).toEqual(
			sorted([...batch, ...optional, ...credential, 'supplied']),
		);
		expect(action.exports).toEqual(['action']);
	});

	it('gives the imports of each minor only from that minor', () => {
		expect(shapeOf(pkg, '2.1.0').world('action-bundle').imports).toEqual(['http', 'log', 'limits']);
		expect(shapeOf(pkg, '2.2.0').world('action-bundle').imports).toContain('binary');
		expect(shapeOf(pkg, '2.2.0').world('action-bundle').imports).not.toContain('dataTables');
	});

	it('has one output case per form of a routed emit', () => {
		type Routed = Emit<'batch', { id: string }, readonly ['a']>;
		const fields = keysOf<{ to: unknown; output: unknown }>()(['to', 'output']);
		expect(sorted(wit.fields('action', 'routed-output'))).toEqual(sorted(fields));
		expect(wit.cases('action', 'output')).toEqual(['item', 'passed', 'made']);
		expectTypeOf<Routed['to']>().toEqualTypeOf<'a'>();
	});

	it('has the run resources of each cardinality and of named inputs', () => {
		const constructorOf = (resource: string) => {
			const def = wit.typeIn('action', resource);
			const found =
				def.kind === 'resource' ? def.funcs.find(({ kind }) => kind === 'constructor') : undefined;
			return found?.params.map(({ name }) => name);
		};
		expect(constructorOf('run')).toEqual(['input']);
		expect(constructorOf('item-run')).toEqual(['input', 'items']);
		expect(constructorOf('join-run')).toEqual(['input', 'inputs']);
		expect(constructorOf('chunk-run')).toEqual(['inputs', 'items', 'continue-on-fail']);
	});
});

describe('the host imports', () => {
	it('have the fields of the TS types', () => {
		expect(sorted(wit.fields('http', 'http-request'))).toEqual(sorted(httpRequestKeys));
		expect(sorted(wit.fields('http', 'http-error'))).toEqual(sorted(httpErrorKeys));
		expect(sorted(wit.fields('limits', 'run-limits'))).toEqual(
			sorted(keysOf<RunLimits>()(['maxRequests', 'maxItems'])),
		);
		expect(wit.cases('http', 'http-method')).toEqual(httpMethods);
		expect(wit.cases('log', 'level')).toEqual(
			membersOf<LogLevel>()(['debug', 'info', 'warn', 'error']),
		);
	});

	it('have one function per method of the TS host objects, and no other', () => {
		expect(wit.funcs('http')).toEqual(keysOf<Http>()(['request']));
		expect(wit.funcs('log')).toEqual(keysOf<Pick<RunHost, 'log'>>()(['log']));
		expect(wit.funcs('code')).toEqual(keysOf<CodeRunner>()(['run']));
		expect(wit.funcs('wait')).toEqual(keysOf<Wait>()(['until']));
		expect(sorted(wit.funcs('data-tables'))).toEqual(
			sorted(keysOf<DataTables>()(['open', 'list', 'create'])),
		);
		expect(sorted(wit.methods('data-tables', 'table'))).toEqual(
			sorted(
				keysOf<DataTable>()([
					'id',
					'columns',
					'rows',
					'insert',
					'update',
					'upsert',
					'delete',
					'clear',
					'rename',
					'drop',
				]),
			),
		);
		// `inputOf(item)` of the TS context is `input-of.get`.
		expect(wit.funcs('input-of')).toEqual(['get']);
	});

	it('have the data table and code types of the TS types', () => {
		expect(sorted(wit.fields('data-tables', 'column'))).toEqual(
			sorted(keysOf<DataTableColumn>()(['name', 'type'])),
		);
		expect(wit.cases('data-tables', 'column-type')).toEqual(
			membersOf<DataTableColumnType>()(['string', 'number', 'boolean', 'date']),
		);
		expect(wit.cases('data-tables', 'operator')).toEqual(
			membersOf<DataTableOperator>()([
				'eq',
				'neq',
				'like',
				'ilike',
				'gt',
				'gte',
				'lt',
				'lte',
				'isEmpty',
				'isNotEmpty',
			]),
		);
		expect(sorted(wit.fields('data-tables', 'condition'))).toEqual(
			sorted(keysOf<Extract<DataTableCondition, { value: unknown }>>()(['column', 'op', 'value'])),
		);
		expect(sorted(wit.fields('data-tables', 'filter'))).toEqual(
			sorted(keysOf<DataTableFilter>()(['match', 'conditions'])),
		);
		expect(sorted(wit.fields('data-tables', 'row-query'))).toEqual(
			sorted(keysOf<DataTableQuery>()(['filter', 'sort', 'offset', 'limit'])),
		);
		expect(sorted(wit.fields('data-tables', 'table-info'))).toEqual(
			sorted(keysOf<DataTableInfo>()(['id', 'name', 'columns', 'createdAt', 'updatedAt'])),
		);
		expect(sorted(wit.fields('data-tables', 'list-query'))).toEqual(
			sorted(keysOf<DataTableListQuery>()(['name', 'sort', 'offset', 'limit'])),
		);
		expect(wit.cases('data-tables', 'table-field')).toEqual(
			membersOf<NonNullable<DataTableListQuery['sort']>['by']>()([
				'name',
				'createdAt',
				'updatedAt',
			]),
		);
		expect(sorted(wit.fields('code', 'code-request'))).toEqual(
			sorted(keysOf<CodeRequest>()(['language', 'code', 'mode'])),
		);
		expect(wit.cases('code', 'language')).toEqual(
			membersOf<CodeRequest['language']>()(['javascript', 'python']),
		);
		expect(wit.cases('code', 'mode')).toEqual(membersOf<CodeRequest['mode']>()(['all', 'each']));
	});

	it('have the binary types of the TS types', () => {
		expect(sorted(wit.fields('binary', 'binary-request'))).toEqual(
			sorted(httpRequestKeys.filter((key) => key !== 'body')),
		);
		expect(sorted(wit.fields('binary', 'binary-meta'))).toEqual(
			sorted(keysOf<BinaryMeta>()(['mimeType', 'fileName', 'bytes'])),
		);
	});
});

describe('the provider interface', () => {
	it('exports one capability resource per kind, with one method per member of the TS type', () => {
		const members = {
			chatModel: keysOf<ChatModel>()(['model', 'chat']),
			memory: keysOf<Memory>()(['load', 'save']),
			tool: keysOf<Tool>()(['name', 'description', 'input', 'call']),
			embeddings: keysOf<Embeddings>()(['embed']),
		} satisfies Record<
			ProviderKind,
			ReadonlyArray<keyof ProviderCapabilities[ProviderKind]> | readonly string[]
		>;
		expect(sorted(wit.cases('capabilities', 'capability'))).toEqual(
			sorted(Object.keys(PROVIDER_CONNECTIONS)),
		);
		Object.entries(members).forEach(([kind, keys]) => {
			const resource = kind.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
			expect(sorted(wit.methods('capabilities', resource))).toEqual(sorted(keys));
		});
		expect(wit.world('provider-bundle').exports).toEqual(['capabilities', 'provider']);
		// The runtime interface keeps its wire names; `supply` runs `ProviderSpec.provide`.
		expect(wit.funcs('provider')).toEqual(['describe', 'supply']);
	});

	it('has the chat types of the TS types', () => {
		expect(sorted(wit.fields('capabilities', 'chat-request'))).toEqual(
			sorted(keysOf<ChatRequest>()(['messages', 'tools', 'output'])),
		);
		expect(sorted(wit.fields('capabilities', 'chat-reply'))).toEqual(
			sorted(keysOf<ChatReply>()(['text', 'toolCalls', 'finishReason', 'usage'])),
		);
		expect(sorted(wit.fields('capabilities', 'chat-usage'))).toEqual(
			sorted(keysOf<ChatUsage>()(['inputTokens', 'outputTokens'])),
		);
		expect(sorted(wit.fields('capabilities', 'tool-call'))).toEqual(
			sorted(keysOf<ToolCall>()(['id', 'name', 'args'])),
		);
		expect(sorted(wit.fields('capabilities', 'tool-definition'))).toEqual(
			sorted(keysOf<ToolDefinition>()(['name', 'description', 'input'])),
		);
	});
});

describe('the trigger interface', () => {
	it('has one export per n8n entry point of a trigger node, and covers each entry point', () => {
		type EntryPoint = keyof Pick<INodeType, 'poll' | 'webhook'> | WebhookSetupMethodNames;
		const entryPoints = membersOf<EntryPoint>()([
			'poll',
			'webhook',
			'checkExists',
			'create',
			'delete',
		]);
		const exportsOf: Record<string, readonly EntryPoint[]> = {
			describe: [],
			poll: ['poll'],
			webhook: ['webhook'],
			activate: ['create'],
			check: ['checkExists'],
			deactivate: ['delete'],
		};
		expect(sorted(wit.funcs('trigger'))).toEqual(sorted(Object.keys(exportsOf)));
		expect(sorted(Object.values(exportsOf).flat())).toEqual(sorted(entryPoints));
	});
});

describe('the credential interface', () => {
	it('exports the code of a custom scheme; exchange and refresh are unstable', () => {
		expect(wit.funcs('credential')).toEqual(keysOf<Pick<CustomAuth, 'sign'>>()(['sign']));
		expect(
			wit
				.iface('credential')
				.funcs.filter(({ unstable }) => unstable === 'credential-exchange')
				.map(({ name }) => name),
		).toEqual(['exchange', 'refresh']);
		expect(wit.world('credential-bundle').imports).toEqual(['http']);
	});
});

describe('the lookup interface', () => {
	it('is unstable: no TS runtime runs a lookup yet', () => {
		expect(pkg.worlds.find(({ name }) => name === 'lookup-bundle')?.unstable).toBe('lookup');
		expect(wit.iface('lookup').unstable).toBe('lookup');
	});
});

describe('spec/manifest.schema.json', () => {
	const schema: unknown = JSON.parse(
		readFileSync(path.resolve(__dirname, '../../spec/manifest.schema.json'), 'utf8'),
	);

	it('lists the fields of the TS manifest types', () => {
		const keys = (json: { properties?: Record<string, unknown> }) =>
			sorted(Object.keys(json.properties ?? {}));
		expect(keys(versionManifestSchema.json)).toEqual(
			sorted(
				keysOf<VersionManifest>()([
					'kind',
					'id',
					'semver',
					'nodeContract',
					'sdk',
					'credentials',
					'contractHash',
					'bundleHash',
					'contract',
					'ui',
				]),
			),
		);
		expect(keys(credentialManifestSchema.json)).toEqual(
			sorted(
				keysOf<CredentialManifest>()([
					'kind',
					'id',
					'name',
					'semver',
					'nodeContract',
					'sdk',
					'displayName',
					'documentationUrl',
					'fields',
					'scheme',
					'baseUrl',
					'hosts',
					'test',
					'notice',
					'legacyParent',
					'renamed',
				]),
			),
		);
		expect(keys(nativeManifestSchema.json)).toEqual(
			sorted(
				keysOf<NativeManifest>()([
					'kind',
					'id',
					'semver',
					'nodeContract',
					'sdk',
					'credentials',
					'contractHash',
					'contract',
					'native',
					'reply',
				]),
			),
		);
		expect(schema).toMatchObject({
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			oneOf: [versionManifestSchema.json, credentialManifestSchema.json, nativeManifestSchema.json],
		});
	});

	it('refuses a manifest without a Node Contract version', () => {
		const manifest = { kind: 'action', id: 'a.b', semver: '1.0.0', contractHash: '0'.repeat(64) };
		expect(validate(manifest, versionManifestSchema.json, { path: 'manifest' })).toEqual(
			expect.arrayContaining(['manifest.nodeContract: is required']),
		);
	});

	describe('as JSON Schema 2020-12', () => {
		const ajv = strictAjv();
		const validateManifest = ajv.compile(schema as JsonSchema);
		const branches = [versionManifestSchema, credentialManifestSchema, nativeManifestSchema].map(
			({ json }) => ajv.compile(json),
		);
		const branchesOf = (manifest: unknown) => branches.map((branch) => branch(manifest));

		it('refuses a keyword that the contract format does not have', () => {
			expect(() => strictAjv().compile({ type: 'string', 'x-n8n-unknown': true })).toThrow(
				/unknown keyword/,
			);
		});

		it('accepts each manifest that the first-party packages ship, with exactly one branch', () => {
			const shipped = shippedManifests();
			expect(shipped.length).toBeGreaterThan(100);
			const failures = shipped.flatMap(({ file, manifest }) => {
				const expected = [
					!('native' in manifest) && manifest.kind !== 'credential',
					manifest.kind === 'credential',
					'native' in manifest,
				];
				return validateManifest(manifest) && isDeepStrictEqual(branchesOf(manifest), expected)
					? []
					: [{ file, branches: branchesOf(manifest), errors: validateManifest.errors }];
			});
			expect(failures).toEqual([]);
			expect(new Set(shipped.map(({ manifest }) => manifest.kind))).toEqual(
				new Set(['action', 'trigger', 'provider', 'credential']),
			);
			expect(shipped.some(({ manifest }) => 'native' in manifest)).toBe(true);
		});

		it('compiles each contract and credential schema that the first-party packages ship', () => {
			const schemas = shippedManifests().flatMap(({ file, manifest }) =>
				[
					manifest.fields,
					manifest.contract?.input,
					manifest.contract?.output,
					manifest.reply?.contract.input,
					manifest.reply?.contract.output,
				].flatMap((json) => (json === undefined ? [] : [{ file, json }])),
			);
			const failures = schemas.flatMap(({ file, json }) => {
				try {
					ajv.compile(json);
					return [];
				} catch (error) {
					return [`${file}: ${String(error)}`];
				}
			});
			expect(failures).toEqual([]);
		});

		describe('with a changed shipped manifest', () => {
			const shippedOf = (isNative: boolean) => {
				const found = shippedManifests().find(({ manifest }) =>
					isNative ? 'native' in manifest : manifest.kind === 'action' && !('native' in manifest),
				);
				if (!found) throw new Error(`no shipped manifest with native ${isNative}`);
				return found.manifest;
			};
			it('refuses a manifest that matches no branch', () => {
				const manifest = { kind: 'action', id: 'a.b', semver: '1.0.0' };
				expect(branchesOf(manifest)).toEqual([false, false, false]);
				expect(validateManifest(manifest)).toBe(false);
			});

			it('refuses a kind that no branch has', () => {
				const action = shippedOf(false);
				const native = shippedOf(true);
				expect(validateManifest({ ...action, kind: 'lookup' })).toBe(false);
				expect(validateManifest({ ...native, kind: 'provider' })).toBe(false);
			});

			it('accepts an unknown top-level field, and refuses one in the contract', () => {
				const action = shippedOf(false);
				expect(validateManifest({ ...action, annotation: true })).toBe(true);
				expect(validateManifest({ ...action, contract: { ...action.contract, extra: true } })).toBe(
					false,
				);
			});

			it('refuses a native manifest with a bundle hash, as the SDK validator does', () => {
				const manifest = { ...shippedOf(true), bundleHash: '0'.repeat(64) };
				expect(branchesOf(manifest)).toEqual([true, false, true]);
				expect(validateManifest(manifest)).toBe(false);
				expect(validate(manifest, schema as JsonSchema)).toEqual([
					'input: does not match any allowed shape',
				]);
			});
		});

		it.each<[string, JsonSchema, unknown, boolean]>([
			[
				'oneOf with two matching branches',
				{ oneOf: [{ type: 'string' }, { type: 'string', minLength: 1 }] },
				'a',
				false,
			],
			[
				'a keyword next to anyOf',
				{
					type: 'object',
					properties: { a: { type: 'string' } },
					required: ['a'],
					anyOf: [{ type: 'object' }],
				},
				{},
				false,
			],
			['const of an object', { const: { a: 1 } }, { a: 1 }, true],
			['enum of an array', { enum: [[1]] }, [1], true],
			['minLength of a surrogate pair', { type: 'string', minLength: 2 }, '😀', false],
			['pattern dot on a surrogate pair', { type: 'string', pattern: '^.$' }, '😀', true],
			[
				'two matching patternProperties',
				{
					type: 'object',
					patternProperties: { '^a': { type: 'string' }, b$: { type: 'string', minLength: 2 } },
				},
				{ ab: 'x' },
				false,
			],
			[
				'a keyword outside the contract format',
				{ type: 'string', maxLength: 1 } as JsonSchema,
				'ab',
				false,
			],
		])('agrees with the SDK validator on %s', (_, json, value, valid) => {
			expect([validate(value, json).length === 0, strictAjv().compile(json)(value)]).toEqual([
				valid,
				valid,
			]);
		});

		it('asserts a format, which JSON Schema 2020-12 only annotates', () => {
			const json: JsonSchema = { type: 'string', format: 'uri' };
			expect([validate('no uri', json).length === 0, strictAjv().compile(json)('no uri')]).toEqual([
				false,
				true,
			]);
			expect(validate('', json)).toEqual([]);
		});
	});
});
