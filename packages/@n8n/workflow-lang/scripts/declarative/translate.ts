/**
 * Translates one declarative node description into a library node module
 * (workflow subset code). It follows `RoutingNode` of n8n-core: request
 * defaults, then each displayed property in description order, with
 * `routing.request`, `routing.send` and `routing.output`.
 */
import type { ExpressionScope } from './expression.ts';
import { literal, translateValue, Untranslatable } from './expression.ts';
import { helperCode } from './helpers.ts';

// ---------------------------------------------------------------------------
// Description shapes (the parts the translator reads)

export interface Routing {
	request?: Record<string, unknown>;
	send?: {
		type?: string;
		property?: string;
		propertyInDotNotation?: boolean;
		value?: string;
		preSend?: unknown[];
		paginate?: boolean | string;
	};
	output?: { postReceive?: unknown[]; maxResults?: number | string };
	operations?: { pagination?: unknown };
}

export interface Property {
	displayName?: string;
	name: string;
	type?: string;
	default?: unknown;
	value?: unknown;
	options?: Property[];
	values?: Property[];
	routing?: Routing;
	displayOptions?: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> };
	typeOptions?: { multipleValues?: boolean };
	extractValue?: unknown;
	modes?: Array<{ name: string; extractValue?: unknown }>;
}

export interface Description {
	displayName: string;
	name: string;
	properties: Property[];
	requestDefaults?: Record<string, unknown>;
	requestOperations?: { pagination?: unknown };
	credentials?: Array<{ name: string; displayOptions?: unknown }>;
}

export interface NodeInput {
	type: string;
	version: number;
	description: Description;
	/** Names of exported hook functions, for messages. */
	hookName: (fn: unknown) => string;
}

export interface OperationResult {
	id: string;
	resource: string;
	operation: string;
	/** Why the operation is not translated. */
	failure?: string;
	/** Parameters dropped from the operation (collection members, fixed collections), with reasons. */
	dropped: string[];
	/** Parameter names the operation accepts. */
	accepts: string[];
	/** Notes about partial support. */
	notes: string[];
}

export interface TranslateResult {
	source: string;
	operations: OperationResult[];
	/** Character ranges of each operation's code in `source`. */
	ranges: Map<string, { start: number; end: number }>;
}

// ---------------------------------------------------------------------------
// Display conditions

interface Context {
	resource: string;
	operation: string;
	version: number;
}

type Condition = true | false | string;

function cndMatches(cnd: Record<string, unknown>, actual: number): boolean {
	const [op, operand] = Object.entries(cnd)[0] ?? [];
	if (typeof operand === 'number') {
		if (op === 'eq') return actual === operand;
		if (op === 'not') return actual !== operand;
		if (op === 'gte') return actual >= operand;
		if (op === 'lte') return actual <= operand;
		if (op === 'gt') return actual > operand;
		if (op === 'lt') return actual < operand;
	}
	if (op === 'between' && typeof operand === 'object' && operand !== null) {
		const { from, to } = operand as { from?: number; to?: number };
		return actual >= (from ?? -Infinity) && actual <= (to ?? Infinity);
	}
	throw new Untranslatable(`display condition ${JSON.stringify(cnd)}`);
}

function staticMatch(values: unknown[], actual: string | number): boolean {
	return values.some((v) => {
		if (typeof v === 'object' && v !== null && '_cnd' in v) {
			if (typeof actual !== 'number') {
				throw new Untranslatable('display condition on text');
			}
			return cndMatches((v as { _cnd: Record<string, unknown> })._cnd, actual);
		}
		return v === actual;
	});
}

function runtimeMatch(values: unknown[], code: string): string {
	if (values.some((v) => typeof v === 'object' && v !== null)) {
		throw new Untranslatable('display condition with an operator');
	}
	return `${JSON.stringify(values)}.includes(${code})`;
}

/**
 * The display condition of a property: true or false when it depends only on
 * resource, operation and version, else code. `valueOf` gives code for the
 * value of another parameter.
 */
function displayCondition(
	property: Property,
	ctx: Context,
	valueOf: (key: string) => string,
): Condition {
	const parts: string[] = [];
	const check = (key: string, values: unknown[]): boolean | string => {
		if (key === 'resource' || key === '/resource') return staticMatch(values, ctx.resource);
		if (key === 'operation' || key === '/operation') return staticMatch(values, ctx.operation);
		if (key === '@version') return staticMatch(values, ctx.version);
		return runtimeMatch(values, valueOf(key.replace(/^\//, '')));
	};
	for (const [key, values] of Object.entries(property.displayOptions?.show ?? {})) {
		const result = check(key, values);
		if (result === false) return false;
		if (typeof result === 'string') parts.push(result);
	}
	for (const [key, values] of Object.entries(property.displayOptions?.hide ?? {})) {
		const result = check(key, values);
		if (result === true) return false;
		if (typeof result === 'string') parts.push(`!${result}`);
	}
	return parts.length === 0 ? true : parts.join(' && ');
}

// ---------------------------------------------------------------------------
// Code generation

function pascal(text: string): string {
	const words = text.split(/[^A-Za-z0-9]+/).filter(Boolean);
	return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('') || 'X';
}

const isFunction = (value: unknown) => typeof value === 'function';

interface PostReceive {
	type?: string;
	enabled?: boolean | string;
	properties?: Record<string, unknown>;
}

function isPostReceive(value: unknown): value is PostReceive {
	return typeof value === 'object' && value !== null;
}

const IGNORED_REQUEST_KEYS = new Set([
	'returnFullResponse',
	'json',
	'timeout',
	'skipSslCertificateValidation',
]);
const REQUEST_KEYS = new Set([
	'method',
	'url',
	'baseURL',
	'headers',
	'qs',
	'body',
	'ignoreHttpStatusErrors',
	'arrayFormat',
	...IGNORED_REQUEST_KEYS,
]);

class OperationWriter {
	readonly lines: string[] = [];

	readonly helpers: Set<string>;

	readonly notes = new Set<string>();

	/** A parameter that fails to translate. Optional ones are dropped, the others fail the operation. */
	readonly dropped: string[] = [];

	readonly accepts = new Set<string>(['resource', 'operation']);

	private counter = 0;

	private readonly node: NodeInput;

	private readonly ctx: Context;

	private readonly fields: Map<string, Property>;

	constructor(node: NodeInput, ctx: Context, fields: Map<string, Property>, helpers: Set<string>) {
		this.node = node;
		this.ctx = ctx;
		this.fields = fields;
		this.helpers = helpers;
	}

	emit(indent: number, line: string) {
		this.lines.push(`${'\t'.repeat(indent)}${line}`);
	}

	fresh(prefix: string): string {
		this.counter++;
		return `${prefix}${this.counter}`;
	}

	/** Code for `$parameter.<name>`: the value with its default, and the value of a resource locator. */
	parameterCode(name: string): string {
		const field = this.fields.get(name);
		const raw = this.rawParameterCode(name);
		return field?.type === 'resourceLocator' ? this.locator(field, raw) : raw;
	}

	/** Code for the stored value of a parameter, with its default. */
	rawParameterCode(name: string): string {
		const field = this.fields.get(name);
		if (!field) return `parameters[${literal(name)}]`;
		return `(parameters[${literal(name)}] ?? ${literal(field.default)})`;
	}

	locator(field: Property, code: string): string {
		this.helpers.add('rlValue');
		const regexModes = (field.modes ?? []).filter((m) => m.extractValue !== undefined);
		return `rlValue(${code}, ${JSON.stringify(regexModes.map((m) => m.name))})`;
	}

	scope(extra: Partial<ExpressionScope>): ExpressionScope {
		return {
			parameter: (name) => this.parameterCode(name),
			version: this.ctx.version,
			helpers: this.helpers,
			...extra,
		};
	}

	/**
	 * Writes the code of one property: its routing, then its children
	 * (`getRequestOptionsFromParameters`). `valueCode` is the parameter value.
	 */
	writeProperty(
		indent: number,
		property: Property,
		valueCode: string | undefined,
		scopeExtra: Partial<ExpressionScope>,
		valueOf: (key: string) => string,
	) {
		const condition = displayCondition(property, this.ctx, valueOf);
		if (condition === false) return;
		const block = condition !== true;
		if (block) {
			this.emit(indent, `if (${condition}) {`);
			indent++;
		}
		const routing = property.routing;
		let value: string | undefined;
		if (routing && valueCode !== undefined) {
			value = this.fresh('value');
			const code =
				property.type === 'resourceLocator' ? this.locator(property, valueCode) : valueCode;
			this.emit(indent, `const ${value} = ${code};`);
		}
		if (routing) this.writeRouting(indent, routing, this.scope({ ...scopeExtra, value }));
		this.writeChildren(indent, property, valueOf, scopeExtra);
		if (block) this.emit(indent - 1, '}');
	}

	private writeRouting(indent: number, routing: Routing, scope: ExpressionScope) {
		if (routing.operations?.pagination !== undefined) {
			this.emit(indent, 'plan.pagination = true;');
		}
		for (const [key, raw] of Object.entries(routing.request ?? {})) {
			if (!REQUEST_KEYS.has(key)) throw new Untranslatable(`request option "${key}"`);
			if (IGNORED_REQUEST_KEYS.has(key)) continue;
			const code = translateValue(raw, scope);
			if (key === 'headers' || key === 'qs' || key === 'body') {
				this.helpers.add('merge');
				this.emit(indent, `merge(plan.${key}, ${code});`);
			} else if (key === 'arrayFormat') {
				this.notes.add(`arrayFormat ${String(raw)}`);
			} else if (key === 'ignoreHttpStatusErrors') {
				this.emit(indent, `plan.ignoreErrors = Boolean(${code});`);
			} else {
				this.emit(indent, `plan.${key} = ${code};`);
			}
		}
		const send = routing.send;
		if (send) {
			if ((send.preSend ?? []).some(isFunction)) {
				throw new Untranslatable(
					`preSend hook ${(send.preSend ?? []).map((h) => this.node.hookName(h)).join(', ')}`,
				);
			}
			if (send.property !== undefined) {
				const property = translateValue(send.property, scope);
				const sent = send.value ? translateValue(send.value, scope) : (scope.value ?? 'undefined');
				const target = send.type === 'body' ? 'plan.body' : 'plan.qs';
				const plainKey =
					typeof send.property === 'string' &&
					!send.property.startsWith('=') &&
					!/[.[]/.test(send.property);
				if (send.propertyInDotNotation === false || plainKey) {
					this.emit(indent, `${target}[${property}] = ${sent};`);
				} else {
					this.helpers.add('setPath');
					this.emit(indent, `setPath(${target}, ${property}, ${sent});`);
				}
			}
			if (send.paginate === true) {
				// The operation always pages through results with the pagination of the node.
				throw new Untranslatable('pagination that is always on');
			}
			if (send.paginate !== undefined) {
				const paginate =
					typeof send.paginate === 'string' && send.paginate.startsWith('=')
						? translateValue(send.paginate, scope)
						: JSON.stringify(Boolean(send.paginate));
				this.emit(indent, `plan.paginate = plan.paginate ?? Boolean(${paginate});`);
			}
		}
		const output = routing.output;
		if (output?.maxResults !== undefined) {
			this.emit(
				indent,
				`plan.maxResults = ${translateValue(output.maxResults, scope)} || plan.maxResults;`,
			);
		}
		for (const action of output?.postReceive ?? []) this.writePostReceive(indent, action, scope);
	}

	private writePostReceive(indent: number, action: unknown, scope: ExpressionScope) {
		if (isFunction(action)) {
			const name = this.node.hookName(action);
			// An error hook only turns an error status into a node error. The node does that too.
			if (/error/i.test(name)) {
				this.notes.add(`postReceive hook ${name}: an HTTP error status fails the step`);
				this.emit(indent, 'plan.failOnErrorStatus = true;');
				return;
			}
			throw new Untranslatable(`postReceive hook ${name}`);
		}
		if (!isPostReceive(action)) throw new Untranslatable('postReceive action');
		let enabled = 'true';
		if (typeof action.enabled === 'string' && action.enabled.startsWith('=')) {
			enabled = translateValue(action.enabled, scope);
		} else if (action.enabled === false) {
			return;
		}
		const props = action.properties ?? {};
		const inner: ExpressionScope = { ...scope, response: 'response' };
		const fn = (body: string) => `(items, response) => ${body}`;
		let step: string;
		switch (action.type) {
			case 'rootProperty': {
				this.helpers.add('getPath');
				const path = literal(props.property);
				step = fn(
					`items.flatMap((item) => { const content = getPath(item, ${path}); return Array.isArray(content) ? content : [content]; })`,
				);
				break;
			}
			case 'set':
				step = fn(`[${translateValue(props.value, inner)}]`);
				break;
			case 'setKeyValue': {
				const itemScope: ExpressionScope = { ...inner, responseItem: 'item' };
				const members = Object.entries(props).map(
					([k, v]) => `${literal(k)}: ${translateValue(v, itemScope)}`,
				);
				step = fn(`items.map((item) => ({ ${members.join(', ')} }))`);
				break;
			}
			case 'limit':
				step = fn(
					`items.slice(0, parseInt(String(${translateValue(props.maxResults, inner)}), 10))`,
				);
				break;
			case 'filter': {
				const itemScope: ExpressionScope = { ...inner, responseItem: 'item' };
				step = fn(`items.filter((item) => ${translateValue(props.pass, itemScope)})`);
				break;
			}
			default:
				throw new Untranslatable(`postReceive action "${String(action.type)}"`);
		}
		const guard = enabled === 'true' ? '' : `if (${enabled}) `;
		this.emit(indent, `${guard}plan.post.push(${step});`);
	}

	private writeChildren(
		indent: number,
		property: Property,
		valueOf: (key: string) => string,
		scopeExtra: Partial<ExpressionScope>,
	) {
		const children = property.options;
		if (!children || property.type === 'multiOptions') return;
		if (property.type === 'options') {
			// The routing of the selected option applies. Resource and operation are known here.
			const selected =
				property.name === 'resource'
					? literal(this.ctx.resource)
					: property.name === 'operation'
						? literal(this.ctx.operation)
						: valueOf(property.name);
			for (const option of children) {
				if (!option.routing) continue;
				const known =
					(property.name === 'resource' && option.value !== this.ctx.resource) ||
					(property.name === 'operation' && option.value !== this.ctx.operation);
				if (known) continue;
				const isKnown = property.name === 'resource' || property.name === 'operation';
				if (!isKnown) this.emit(indent, `if (${selected} === ${literal(option.value)}) {`);
				const value = this.fresh('value');
				this.emit(indent + (isKnown ? 0 : 1), `const ${value} = ${literal(option.value)};`);
				this.writeRouting(
					indent + (isKnown ? 0 : 1),
					option.routing,
					this.scope({ ...scopeExtra, value }),
				);
				if (!isKnown) this.emit(indent, '}');
			}
			return;
		}
		if (property.type === 'collection') {
			const collection = this.fresh('collection');
			const holder = valueOf(property.name);
			const routed = children.filter((c) => hasRouting(c));
			for (const member of children) this.accepts.add(`${property.name}.${member.name}`);
			if (routed.length === 0) return;
			this.emit(indent, `const ${collection} = (${holder} ?? {}) as Record<string, unknown>;`);
			for (const member of routed) {
				const start = this.lines.length;
				try {
					this.emit(indent, `if (Object.keys(${collection}).includes(${literal(member.name)})) {`);
					this.writeProperty(
						indent + 1,
						member,
						`${collection}[${literal(member.name)}]`,
						scopeExtra,
						(key) => this.siblingValue(collection, children, key, valueOf),
					);
					this.emit(indent, '}');
				} catch (error) {
					if (!(error instanceof Untranslatable)) throw error;
					this.lines.length = start;
					this.dropped.push(`${property.name}.${member.name}: ${error.message}`);
					this.accepts.delete(`${property.name}.${member.name}`);
				}
			}
			return;
		}
		if (property.type === 'fixedCollection') {
			this.writeFixedCollection(indent, property, valueOf);
			return;
		}
		throw new Untranslatable(`options under a "${String(property.type)}" property`);
	}

	/** Code for a fixed collection: each group, each entry, each value field. */
	writeFixedCollection(indent: number, property: Property, valueOf: (key: string) => string) {
		const holder = this.fresh('fixed');
		this.emit(
			indent,
			`const ${holder} = (${valueOf(property.name)} ?? {}) as Record<string, unknown>;`,
		);
		for (const group of property.options ?? []) {
			const values = group.values ?? [];
			if (!values.some((v) => hasRouting(v))) continue;
			const entries = this.fresh('entries');
			const entry = this.fresh('entry');
			const index = this.fresh('index');
			this.emit(indent, `if (${holder}[${literal(group.name)}] !== undefined) {`);
			this.emit(indent + 1, `const raw = ${holder}[${literal(group.name)}];`);
			this.emit(
				indent + 1,
				`const ${entries} = (Array.isArray(raw) ? raw : [raw]) as Array<Record<string, unknown>>;`,
			);
			this.emit(indent + 1, `for (let ${index} = 0; ${index} < ${entries}.length; ${index}++) {`);
			this.emit(indent + 2, `const ${entry} = ${entries}[${index}];`);
			for (const field of values) {
				this.writeProperty(
					indent + 2,
					field,
					`(${entry}[${literal(field.name)}] ?? ${literal(field.default)})`,
					{ index, parent: entry },
					(key) => this.siblingValue(entry, values, key, valueOf),
				);
			}
			this.emit(indent + 1, '}');
			this.emit(indent, '}');
		}
	}

	private siblingValue(
		holder: string,
		siblings: Property[],
		key: string,
		outer: (key: string) => string,
	): string {
		const sibling = siblings.find((s) => s.name === key);
		if (!sibling) return outer(key);
		return `(${holder}[${literal(key)}] ?? ${literal(sibling.default)})`;
	}
}

function hasRouting(property: Property): boolean {
	if (property.routing) return true;
	return [...(property.options ?? []), ...(property.values ?? [])].some(hasRouting);
}

// ---------------------------------------------------------------------------
// Node

function shows(property: Property, key: string, value: string | number): boolean | null {
	const values = property.displayOptions?.show?.[key];
	if (!values) return null;
	return staticMatch(values, value);
}

function hiddenFor(property: Property, key: string, value: string | number): boolean {
	const values = property.displayOptions?.hide?.[key];
	return values ? staticMatch(values, value) : false;
}

function visibleFor(property: Property, partial: Partial<Context>): boolean {
	for (const [key, value] of Object.entries(partial)) {
		const k = key === 'version' ? '@version' : key;
		if (shows(property, k, value) === false) return false;
		if (hiddenFor(property, k, value)) return false;
	}
	return true;
}

/** The resource and operation pairs of a node, with their option routing. */
function operationsOf(
	description: Description,
	version: number,
): {
	resourceDefault: string;
	defaults: Map<string, string>;
	pairs: Array<{ resource: string; operation: string }>;
} {
	const props = description.properties.filter((p) => visibleFor(p, { version }));
	const resourceProp = props.find((p) => p.name === 'resource' && p.type === 'options');
	const resources = resourceProp ? (resourceProp.options ?? []).map((o) => String(o.value)) : [''];
	const defaults = new Map<string, string>();
	const pairs: Array<{ resource: string; operation: string }> = [];
	for (const resource of resources) {
		const opProp = props.find(
			(p) =>
				p.name === 'operation' &&
				p.type === 'options' &&
				(resource === '' || visibleFor(p, { resource })),
		);
		if (!opProp) {
			pairs.push({ resource, operation: '' });
			continue;
		}
		defaults.set(resource, typeof opProp.default === 'string' ? opProp.default : '');
		for (const option of opProp.options ?? []) {
			pairs.push({ resource, operation: String(option.value) });
		}
	}
	const resourceDefault = typeof resourceProp?.default === 'string' ? resourceProp.default : '';
	return { resourceDefault, defaults, pairs };
}

function opId(resource: string, operation: string): string {
	return [resource, operation].filter(Boolean).join('.') || 'default';
}

export function translateNode(
	node: NodeInput,
	excluded: Map<string, string> = new Map(),
): TranslateResult {
	const { description, version } = node;
	const { resourceDefault, defaults, pairs } = operationsOf(description, version);
	const helpers = new Set<string>(['joinUrl']);
	const operations: OperationResult[] = [];
	const bodies: Array<{ id: string; fn: string; code: string[] }> = [];
	const requestDefaults = description.requestDefaults ?? {};

	for (const { resource, operation } of pairs) {
		const id = opId(resource, operation);
		const result: OperationResult = {
			id,
			resource,
			operation,
			dropped: [],
			accepts: [],
			notes: [],
		};
		operations.push(result);
		if (excluded.has(id)) {
			result.failure = excluded.get(id);
			continue;
		}
		const ctx: Context = { resource, operation, version };
		const opHelpers = new Set<string>();
		const fields = new Map<string, Property>();
		const visible = description.properties.filter((p) => {
			try {
				return displayCondition(p, ctx, () => 'x') !== false;
			} catch {
				return true;
			}
		});
		for (const p of visible) if (!fields.has(p.name)) fields.set(p.name, p);
		const writer = new OperationWriter(node, ctx, fields, opHelpers);
		const valueOf = (key: string) => writer.parameterCode(key);
		try {
			const defaultsScope = writer.scope({});
			writer.emit(1, 'const plan: Plan = {');
			writer.emit(
				2,
				`method: ${requestDefaults.method ? translateValue(requestDefaults.method, defaultsScope) : "'GET'"},`,
			);
			writer.emit(
				2,
				`url: ${requestDefaults.url !== undefined ? translateValue(requestDefaults.url, defaultsScope) : "''"},`,
			);
			writer.emit(
				2,
				`baseURL: ${requestDefaults.baseURL !== undefined ? translateValue(requestDefaults.baseURL, defaultsScope) : 'undefined'},`,
			);
			for (const key of ['headers', 'qs', 'body']) {
				const raw = requestDefaults[key];
				writer.emit(2, `${key}: ${raw !== undefined ? translateValue(raw, defaultsScope) : '{}'},`);
			}
			writer.emit(
				2,
				`ignoreErrors: ${requestDefaults.ignoreHttpStatusErrors ? translateValue(requestDefaults.ignoreHttpStatusErrors, defaultsScope) : 'false'},`,
			);
			writer.emit(2, 'failOnErrorStatus: false,');
			writer.emit(2, 'pagination: false,');
			writer.emit(2, 'paginate: undefined,');
			writer.emit(2, 'maxResults: undefined,');
			writer.emit(2, 'post: [],');
			writer.emit(1, '};');
			for (const key of Object.keys(requestDefaults)) {
				if (!REQUEST_KEYS.has(key)) throw new Untranslatable(`request default "${key}"`);
			}
			if (description.requestOperations?.pagination !== undefined) {
				writer.emit(1, 'plan.pagination = true;');
			}
			for (const property of visible) {
				writer.accepts.add(property.name);
				if (property.name === 'resource' || property.name === 'operation') {
					writer.writeProperty(
						1,
						property,
						literal(property.name === 'resource' ? resource : operation),
						{},
						valueOf,
					);
					continue;
				}
				if (property.type === 'fixedCollection') {
					if (!hasRouting(property)) continue;
					const start = writer.lines.length;
					try {
						writer.writeProperty(1, property, writer.rawParameterCode(property.name), {}, valueOf);
					} catch (error) {
						if (!(error instanceof Untranslatable)) throw error;
						writer.lines.length = start;
						writer.dropped.push(`${property.name}: ${error.message}`);
						writer.accepts.delete(property.name);
					}
					continue;
				}
				if (!hasRouting(property)) continue;
				writer.writeProperty(1, property, writer.rawParameterCode(property.name), {}, valueOf);
			}
			writer.emit(1, 'return plan;');
		} catch (error) {
			if (!(error instanceof Untranslatable)) throw error;
			result.failure = error.message;
			continue;
		}
		for (const h of opHelpers) helpers.add(h);
		result.dropped = writer.dropped;
		result.accepts = [...writer.accepts].sort();
		result.notes = [...writer.notes];
		bodies.push({ id, fn: `plan${pascal(id)}`, code: writer.lines });
	}

	const translated = operations.filter((o) => o.failure === undefined);
	const lines: string[] = [];
	const ranges = new Map<string, { start: number; end: number }>();
	let size = 0;
	const emit = (line = '') => {
		lines.push(line);
		size += line.length + 1;
	};
	emit(
		'// @ts-nocheck: generated from n8n expressions, which carry no types. The compiler checks the subset.',
	);
	emit('/**');
	emit(` * Compiled library node: \`${node.type}\` (version ${version}).`);
	emit(' *');
	emit(' * Generated by scripts/translate-declarative.ts from the declarative description');
	emit(' * of the node. Do not edit.');
	emit(` * Operations: ${translated.map((o) => o.id).join(', ') || 'none'}.`);
	emit(' */');
	emit("import { defineNode, type HttpResponse, type Item } from '@n8n/workflow-lang';");
	emit();
	emit('interface Plan {');
	emit('\tmethod: string;');
	emit('\turl: string;');
	emit('\tbaseURL: string | undefined;');
	emit('\theaders: Record<string, unknown>;');
	emit('\tqs: Record<string, unknown>;');
	emit('\tbody: Record<string, unknown>;');
	emit('\tignoreErrors: boolean;');
	emit('\tfailOnErrorStatus: boolean;');
	emit('\tpagination: boolean;');
	emit('\tpaginate: boolean | undefined;');
	emit('\tmaxResults: unknown;');
	emit('\tpost: Array<(items: unknown[], response: HttpResponse<unknown>) => unknown[]>;');
	emit('}');
	emit();
	emit('type Parameters = Record<string, unknown>;');
	for (const code of helperCode(helpers)) {
		emit();
		for (const line of code.split('\n')) emit(line);
	}
	for (const body of bodies) {
		const start = size;
		emit();
		emit(`function ${body.fn}(parameters: Parameters): Plan {`);
		for (const line of body.code) emit(line);
		emit('}');
		ranges.set(body.id, { start, end: size });
	}
	emit();
	emit('function defaultOperation(resource: string): string {');
	for (const [resource, op] of defaults)
		emit(`\tif (resource === ${literal(resource)}) return ${literal(op)};`);
	emit("\treturn '';");
	emit('}');
	emit();
	const supports: Record<string, string[]> = {};
	for (const op of translated) supports[op.id] = op.accepts;
	emit('export default defineNode<Parameters>({');
	emit(`\ttype: ${literal(node.type)},`);
	emit(`\tversion: ${version},`);
	emit('\tsupports: {');
	emit(`\t\tresource: ${literal(resourceDefault)},`);
	emit(`\t\toperation: ${JSON.stringify(Object.fromEntries(defaults))},`);
	emit('\t\toperations: {');
	for (const [id, accepts] of Object.entries(supports))
		emit(`\t\t\t${literal(id)}: ${JSON.stringify(accepts)},`);
	emit('\t\t},');
	emit('\t},');
	emit('\tasync run(ctx, parameters, _items, credential) {');
	emit(`\t\tconst resource = String(parameters.resource ?? ${literal(resourceDefault)});`);
	emit('\t\tconst operation = String(parameters.operation ?? defaultOperation(resource));');
	emit('\t\tlet plan: Plan;');
	translated.forEach((op, i) => {
		const keyword = i === 0 ? 'if' : '} else if';
		emit(
			`\t\t${keyword} (resource === ${literal(op.resource)} && operation === ${literal(op.operation)}) {`,
		);
		emit(`\t\t\tplan = plan${pascal(op.id)}(parameters);`);
	});
	if (translated.length > 0) emit('\t\t} else {');
	emit(
		`\t\t\tthrow new Error(\`${description.displayName}: \${resource}.\${operation} is not in the compiled library\`);`,
	);
	if (translated.length > 0) emit('\t\t}');
	emit('\t\tif (plan.paginate === true && plan.pagination) {');
	emit(
		`\t\t\tthrow new Error('${description.displayName.replace(/'/g, "\\'")}: returning all results is not in the compiled library. Set a limit.');`,
	);
	emit('\t\t}');
	emit('\t\tconst response = await ctx.http<unknown>({');
	emit('\t\t\tmethod: String(plan.method).toUpperCase(),');
	emit('\t\t\turl: joinUrl(plan.baseURL, plan.url),');
	emit('\t\t\theaders: plan.headers,');
	emit('\t\t\tqs: plan.qs,');
	emit('\t\t\tbody: Object.keys(plan.body).length > 0 ? plan.body : undefined,');
	emit('\t\t\tcredential,');
	emit('\t\t});');
	emit('\t\tif (response.status >= 400 && (!plan.ignoreErrors || plan.failOnErrorStatus)) {');
	emit(`\t\t\tthrow new Error(\`${description.displayName}: HTTP status \${response.status}\`);`);
	emit('\t\t}');
	emit('\t\tlet items: unknown[] = [response.body];');
	emit(
		'\t\tif (plan.post.length === 0 && Array.isArray(response.body)) items = [...response.body];',
	);
	emit('\t\tfor (const step of plan.post) items = step(items, response);');
	emit('\t\tif (plan.maxResults) items = items.slice(0, Number(plan.maxResults));');
	emit('\t\treturn items as Item[];');
	emit('\t},');
	emit('});');
	return { source: `${lines.join('\n')}\n`, operations, ranges };
}
