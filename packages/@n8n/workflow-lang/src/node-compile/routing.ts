import { dirname, join, relative } from 'node:path';

import ts from 'typescript';

import { displayParameter } from '../convert/node-parameters.ts';
import type { NodeDescription } from '../convert/node-parameters.ts';
import type { RoutingScope } from './routing-expression.ts';
import {
	ROUTING_TEXT_HELPERS,
	RoutingRefusal,
	routingLiteral,
	routingValue,
} from './routing-expression.ts';
import { hasExpression } from './specialise.ts';

type Json = Record<string, unknown>;
type Segment = string | number;
type ReadFile = (path: string) => string | undefined;

export interface RoutedEntry {
	entry: string;
	readFile: ReadFile;
	refusals: string[];
}

export interface RoutedInput {
	description: NodeDescription;
	parameters: Json;
	version: number;
	entry: string;
	readFile: ReadFile;
	hasCredential: (type: string) => boolean;
}

const ITEM = '__routedItem';
const MAX_FILES = 200;
const OWN_RUN_METHODS = new Set(['execute', 'poll', 'trigger', 'webhook', 'supplyData']);
const REQUEST_SETTINGS = ['batching', 'proxy', 'timeout', 'allowUnauthorizedCerts'];
const SINGLE_CONTEXT = /IExecuteSingleFunctions|IExecutePaginationFunctions/;
const ITEM_MEMBERS =
	/this\s*\.\s*(getNodeParameter|getInputData|getItemIndex|evaluateExpression|getExecuteData)\b|assertBinaryData|getBinaryDataBuffer|\.(call|apply)\(\s*this\b/;
const CONTEXT_MEMBERS = new Set([
	'getNode',
	'getCredentials',
	'helpers',
	'continueOnFail',
	'getWorkflow',
	'getMode',
	'getTimezone',
	'logger',
	'getNodeParameter',
	'getInputData',
	'getItemIndex',
]);
const HELPER_MEMBERS = new Set([
	'httpRequest',
	'httpRequestWithAuthentication',
	'requestWithAuthentication',
	'request',
	'requestOAuth2',
	'returnJsonArray',
	'prepareBinaryData',
	'assertBinaryData',
	'getBinaryDataBuffer',
	'constructExecutionMetaData',
]);
const ITEM_HELPERS = new Set(['assertBinaryData', 'getBinaryDataBuffer']);

function isRecord(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordOf(value: unknown): Json | undefined {
	return isRecord(value) ? value : undefined;
}

function listOf(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function isRoutedDescription(description: unknown): boolean {
	return isRecord(description) && description.requestDefaults !== undefined;
}

export function hasExecuteMethod(source: string): boolean {
	const sf = ts.createSourceFile('entry.ts', source, ts.ScriptTarget.ES2022, false);
	return sf.statements.some(
		(statement) =>
			ts.isClassDeclaration(statement) &&
			statement.members.some(
				(member) =>
					ts.isMethodDeclaration(member) &&
					ts.isIdentifier(member.name) &&
					OWN_RUN_METHODS.has(member.name.text),
			),
	);
}

function at(root: unknown, path: Segment[]): unknown {
	let value = root;
	for (const key of path) {
		if (Array.isArray(value) && typeof key === 'number') value = value[key];
		else if (isRecord(value) && typeof key === 'string' && Object.hasOwn(value, key))
			value = value[key];
		else return undefined;
	}
	return value;
}

function resolveModule(from: string, specifier: string, readFile: ReadFile): string | undefined {
	const base = join(dirname(from), specifier);
	return [`${base}.ts`, `${base}/index.ts`].find((path) => readFile(path) !== undefined);
}

function relativeImports(text: string): string[] {
	return [...text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((match) => match[1]);
}

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression;

function functionsOf(sf: ts.SourceFile): Map<string, FunctionNode> {
	const found = new Map<string, FunctionNode>();
	for (const statement of sf.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name)
			found.set(statement.name.text, statement);
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (
				ts.isIdentifier(declaration.name) &&
				declaration.initializer &&
				ts.isFunctionExpression(declaration.initializer)
			)
				found.set(declaration.name.text, declaration.initializer);
		}
	}
	return found;
}

function contextTypeOf(fn: FunctionNode, sf: ts.SourceFile): string | undefined {
	const first = fn.parameters[0];
	return first && ts.isIdentifier(first.name) && first.name.text === 'this' && first.type
		? first.type.getText(sf)
		: undefined;
}

type ContextKind = 'single' | 'neutral' | 'unknown';

function contextKindOf(fn: FunctionNode, sf: ts.SourceFile): ContextKind {
	const type = contextTypeOf(fn, sf);
	if (type === undefined)
		return fn.body && /\bthis\b/.test(fn.body.getText(sf)) ? 'unknown' : 'neutral';
	if (SINGLE_CONTEXT.test(type) && !/\bIExecuteFunctions\b/.test(type)) return 'single';
	return fn.body && ITEM_MEMBERS.test(fn.body.getText(sf)) ? 'unknown' : 'neutral';
}

function parse(path: string, text: string): ts.SourceFile {
	return ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true);
}

function importedFrom(sf: ts.SourceFile, name: string): { from: string; name: string } | undefined {
	for (const statement of sf.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
			continue;
		const bindings = statement.importClause?.namedBindings;
		if (!bindings || !ts.isNamedImports(bindings)) continue;
		for (const element of bindings.elements) {
			if (element.name.text === name)
				return {
					from: statement.moduleSpecifier.text,
					name: (element.propertyName ?? element.name).text,
				};
		}
	}
	return undefined;
}

function calleeKind(
	sf: ts.SourceFile,
	path: string,
	name: string,
	readFile: ReadFile,
): ContextKind {
	const local = functionsOf(sf).get(name);
	if (local) return contextKindOf(local, sf);
	const imported = importedFrom(sf, name);
	if (!imported?.from.startsWith('.')) return 'unknown';
	const target = resolveModule(path, imported.from, readFile);
	const text = target === undefined ? undefined : readFile(target);
	if (target === undefined || text === undefined) return 'unknown';
	const other = parse(target, text);
	const declared = functionsOf(other).get(imported.name);
	return declared ? contextKindOf(declared, other) : 'unknown';
}

export function singleItemSource(
	path: string,
	text: string,
	readFile: ReadFile,
	refuse: (reason: string) => void,
): string {
	if (!SINGLE_CONTEXT.test(text)) return text;
	const sf = parse(path, text);
	const edits: Array<{ at: number; end: number; text: string }> = [];
	const insert = (position: number, added: string) =>
		edits.push({ at: position, end: position, text: added });
	const poison = (node: ts.Node, what: string, where: string) => {
		refuse(`${where}: ${what} has no form for one item`);
		edits.push({ at: node.getStart(sf), end: node.getEnd(), text: 'routingUnsupported' });
	};
	const rewrite = (fn: FunctionNode, where: string) => {
		const contextParameter = fn.parameters[0];
		insert(contextParameter.getEnd(), `, ${ITEM}: number`);
		const visit = (node: ts.Node): void => {
			if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) return;
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
				const callee = node.expression;
				const onContext = callee.expression.kind === ts.SyntaxKind.ThisKeyword;
				const member = callee.name.text;
				if (onContext && member === 'getNodeParameter' && node.arguments.length > 0) {
					insert(node.arguments[0].getEnd(), `, ${ITEM}`);
					node.arguments.forEach(visit);
					return;
				}
				if (onContext && member === 'getItemIndex') {
					edits.push({ at: node.getStart(sf), end: node.getEnd(), text: ITEM });
					return;
				}
				if (onContext && member === 'getInputData' && node.arguments.length === 0) {
					insert(node.getEnd(), `[${ITEM}]`);
					return;
				}
				if (
					ITEM_HELPERS.has(member) &&
					ts.isPropertyAccessExpression(callee.expression) &&
					callee.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
					callee.expression.name.text === 'helpers' &&
					node.arguments.length > 0
				) {
					insert(node.arguments[0].getStart(sf), `${ITEM}, `);
					node.arguments.forEach(visit);
					return;
				}
				const first = node.arguments[0];
				if (
					(member === 'call' || member === 'apply') &&
					first?.kind === ts.SyntaxKind.ThisKeyword &&
					!(
						ts.isPropertyAccessExpression(callee.expression) &&
						callee.expression.expression.kind === ts.SyntaxKind.ThisKeyword
					) &&
					!(
						ts.isPropertyAccessExpression(callee.expression) &&
						ts.isPropertyAccessExpression(callee.expression.expression) &&
						callee.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
					)
				) {
					const kind =
						member === 'call' && ts.isIdentifier(callee.expression)
							? calleeKind(sf, path, callee.expression.text, readFile)
							: 'unknown';
					if (kind === 'single') insert(first.getEnd(), `, ${ITEM}`);
					else if (kind === 'unknown')
						poison(callee.expression, `the call of '${callee.expression.getText(sf)}'`, where);
					node.arguments.slice(1).forEach(visit);
					return;
				}
			}
			if (
				ts.isPropertyAccessExpression(node) &&
				node.expression.kind === ts.SyntaxKind.ThisKeyword
			) {
				if (!CONTEXT_MEMBERS.has(node.name.text))
					poison(node.name, `'this.${node.name.text}'`, where);
				else if (
					node.name.text === 'helpers' &&
					ts.isPropertyAccessExpression(node.parent) &&
					!HELPER_MEMBERS.has(node.parent.name.text)
				)
					poison(node.parent.name, `'this.helpers.${node.parent.name.text}'`, where);
				return;
			}
			if (node.kind === ts.SyntaxKind.ThisKeyword) {
				const parent = node.parent;
				const passed =
					ts.isCallExpression(parent) &&
					parent.arguments[0] === node &&
					ts.isPropertyAccessExpression(parent.expression) &&
					parent.expression.name.text === 'call';
				if (!passed) poison(node, "'this' as a value", where);
				return;
			}
			ts.forEachChild(node, visit);
		};
		if (fn.body) visit(fn.body);
	};
	for (const [name, fn] of functionsOf(sf)) {
		if (contextKindOf(fn, sf) === 'single') rewrite(fn, name);
	}
	let out = text;
	for (const edit of edits.sort((a, b) => b.at - a.at || b.end - a.end))
		out = out.slice(0, edit.at) + edit.text + out.slice(edit.end);
	return out;
}

function findHook(
	entry: string,
	readFile: ReadFile,
	name: string,
): { file: string } | { refusal: string } {
	const seen = new Set<string>([entry]);
	const queue = [entry];
	const homes: string[] = [];
	for (let k = 0; k < queue.length && k < MAX_FILES; k++) {
		const text = readFile(queue[k]);
		if (text === undefined) continue;
		const sf = parse(queue[k], text);
		const declared = functionsOf(sf).get(name);
		const exported =
			declared !== undefined &&
			new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b|export\\s+const\\s+${name}\\b`).test(
				text,
			);
		if (declared && exported) {
			if (contextKindOf(declared, sf) !== 'single')
				return { refusal: `the hook '${name}' does not declare a context for one item` };
			homes.push(queue[k]);
		}
		for (const specifier of relativeImports(text)) {
			const target = resolveModule(queue[k], specifier, readFile);
			if (target !== undefined && !seen.has(target)) {
				seen.add(target);
				queue.push(target);
			}
		}
	}
	if (homes.length !== 1)
		return { refusal: `the hook '${name}' has ${homes.length} declarations in the node source` };
	return { file: homes[0] };
}

interface PostAction {
	hook?: string;
	action?: Json;
	enabled?: string;
}

interface PostGroup {
	value: string;
	actions: PostAction[];
}

class RoutedWriter {
	readonly build: string[] = [];

	readonly hooks = new Map<string, string>();

	readonly preSend: string[] = [];

	readonly groups: PostGroup[] = [];

	pagination: unknown;

	mayPaginate = false;

	private counter = 0;

	private dirty: boolean;

	private readonly input: RoutedInput;

	private readonly credentialType: string | undefined;

	constructor(input: RoutedInput, credentialType: string | undefined) {
		this.input = input;
		this.credentialType = credentialType;
		const defaults = recordOf(Reflect.get(input.description, 'requestDefaults')) ?? {};
		this.dirty = ['qs', 'body', 'headers'].some((key) => key in defaults);
		this.pagination = recordOf(Reflect.get(input.description, 'requestOperations'))?.pagination;
	}

	private fresh(prefix: string): string {
		this.counter++;
		return `${prefix}${this.counter}`;
	}

	private emit(line: string) {
		this.build.push(line);
	}

	private hookName(fn: unknown): string {
		const name = typeof fn === 'function' ? fn.name : '';
		if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new RoutingRefusal('a hook without a name');
		const known = this.hooks.get(name);
		if (known !== undefined) return name;
		const found = findHook(this.input.entry, this.input.readFile, name);
		if ('refusal' in found) throw new RoutingRefusal(found.refusal);
		this.hooks.set(name, found.file);
		return name;
	}

	private read(path: Segment[], options = ''): string {
		const top = String(path[0]);
		const members = path
			.slice(1)
			.map((key) => `[${JSON.stringify(key)}]`)
			.join('');
		const call = `this.getNodeParameter(${JSON.stringify(top)}, i${options})`;
		return members === '' ? call : `(${call} as any)${members}`;
	}

	private parameter(name: string): string {
		const parameters = this.input.parameters;
		if (!Object.hasOwn(parameters, name)) return 'undefined';
		let raw = parameters[name];
		let member = '';
		if (isRecord(raw) && raw.__rl === true && 'value' in raw) {
			if (raw.__regex !== undefined)
				throw new RoutingRefusal(`'$parameter.${name}' reads a locator with a pattern`);
			raw = raw.value;
			member = '.value';
		}
		if (typeof raw === 'string' && raw.startsWith('='))
			return `(${this.read([name], ', undefined, { skipValidation: true }')} as any)${member}`;
		return `(${routingLiteral(raw)} as any)`;
	}

	private staticName(raw: unknown): unknown {
		if (typeof raw !== 'string' || !raw.startsWith('=')) return raw;
		const { parameters } = this.input;
		let dynamic = false;
		const text = raw
			.slice(1)
			.replace(/\{\{\s*\$parameter(?:\.(\w+)|\["(\w+)"\])\s*\}\}/g, (whole, dotted, quoted) => {
				const value = parameters[String(dotted ?? quoted)];
				const fixed =
					(typeof value === 'string' && value !== '' && !value.startsWith('=')) ||
					(typeof value === 'number' && Number.isFinite(value));
				if (!fixed) dynamic = true;
				return fixed ? String(value) : String(whole);
			});
		return dynamic || text.includes('{{') || text.startsWith('=') ? raw : text;
	}

	scope(extra: Partial<RoutingScope>): RoutingScope {
		return {
			parameter: (name) => this.parameter(name),
			credentials: this.credentialType === undefined ? undefined : 'credentials',
			version: this.input.version,
			...extra,
		};
	}

	private displayed(property: Json): boolean {
		const { parameters, version, description } = this.input;
		const shown = { ...property, name: String(property.name) };
		return displayParameter(parameters, shown, version, description, parameters);
	}

	private valueOf(property: Json, path: Segment[]): string | undefined {
		if (!('type' in property)) return undefined;
		const extract = property.extractValue !== undefined || property.type === 'resourceLocator';
		const raw = at(this.input.parameters, path);
		if (raw === undefined)
			throw new RoutingRefusal(`the parameter '${path.join('.')}' has no value`);
		if (path.length > 1 && extract)
			throw new RoutingRefusal(
				`the parameter '${path.join('.')}' extracts its value in a collection`,
			);
		const name = this.fresh('value');
		this.emit(
			`const ${name}: any = ${this.read(path, `, undefined, { extractValue: ${extract} }`)};`,
		);
		return name;
	}

	property(property: Json, path: Segment[], target: string, keys: Partial<RoutingScope>) {
		if (!this.displayed(property)) return;
		if (!this.routed(property)) {
			if (this.dirty) {
				this.emit(`routingMerge(${target}, { qs: {}, body: {}, headers: {} });`);
				if (target === 'requestOptions') this.dirty = false;
			}
			return;
		}
		const own = this.fresh('routed');
		this.emit(`const ${own}: any = { qs: {}, body: {}, headers: {} };`);
		const here = [...path, String(property.name)];
		const routing = recordOf(property.routing);
		if (routing) this.routing(routing, property, here, own, keys);
		this.children(property, path, own, keys);
		this.emit(`routingMerge(${target}, ${own});`);
	}

	private routed(property: Json): boolean {
		if (property.routing !== undefined) return true;
		return [...listOf(property.options), ...listOf(property.values)].some(
			(child) => isRecord(child) && this.routed(child),
		);
	}

	private routing(
		routing: Json,
		property: Json,
		path: Segment[],
		own: string,
		keys: Partial<RoutingScope>,
	) {
		const value = this.valueOf(property, path);
		const scope = this.scope({ ...keys, value: value ?? 'undefined' });
		const operations = recordOf(routing.operations);
		if (operations && 'pagination' in operations) this.pagination = operations.pagination;
		for (const [key, raw] of Object.entries(recordOf(routing.request) ?? {})) {
			checkRequestKey(key);
			if (['qs', 'body', 'headers'].includes(key)) this.dirty = true;
			this.emit(`${own}[${JSON.stringify(key)}] = ${routingValue(raw, scope)};`);
		}
		const send = recordOf(routing.send);
		if (send) {
			if (send.property !== undefined) {
				const name = routingValue(this.staticName(send.property), scope, true);
				const sent = send.value
					? routingValue(send.value, this.scope({ ...keys, value: value ?? 'undefined' }))
					: (value ?? 'undefined');
				const holder = send.type === 'body' ? `${own}.body` : `${own}.qs`;
				if (send.propertyInDotNotation === false) this.emit(`${holder}[${name}] = ${sent};`);
				else this.emit(`set(${holder}, ${name}, ${sent});`);
			}
			if (send.paginate !== undefined) {
				const paginate =
					typeof send.paginate === 'string' && send.paginate.startsWith('=')
						? routingValue(send.paginate, scope)
						: routingLiteral(send.paginate);
				if (send.paginate !== false) this.mayPaginate = true;
				const flag = this.fresh('paginate');
				this.emit(`const ${flag} = !!${paginate};`);
				this.emit(`if (paginate === undefined) paginate = ${flag};`);
			}
			for (const hook of listOf(send.preSend)) this.preSend.push(this.hookName(hook));
		}
		const output = recordOf(routing.output);
		if (!output) return;
		if (output.maxResults !== undefined) {
			const limit = this.fresh('limit');
			this.emit(`const ${limit}: any = ${routingValue(output.maxResults, scope, true)};`);
			this.emit(`if (${limit}) maxResults = ${limit};`);
		}
		const actions: PostAction[] = [];
		for (const action of listOf(output.postReceive)) {
			if (typeof action === 'function') {
				actions.push({ hook: this.hookName(action) });
				continue;
			}
			if (!isRecord(action)) throw new RoutingRefusal('a postReceive action that is not data');
			if (typeof action.enabled === 'string' && action.enabled.startsWith('=')) {
				const enabled = this.fresh('enabled');
				this.emit(`const ${enabled}: any = ${routingValue(action.enabled, scope)};`);
				actions.push({ action, enabled });
			} else if (action.enabled !== false) {
				actions.push({ action });
			}
		}
		if (actions.length > 0) this.groups.push({ value: value ?? 'undefined', actions });
	}

	private children(property: Json, path: Segment[], own: string, keys: Partial<RoutingScope>) {
		if (!Object.hasOwn(property, 'options')) return;
		const name = String(property.name);
		const here = [...path, name];
		const raw = at(this.input.parameters, here);
		if (property.type === 'options') {
			const selected = listOf(property.options).find(
				(option) => isRecord(option) && option.value === raw,
			);
			if (isRecord(selected)) this.property(selected, here, own, keys);
		} else if (property.type === 'collection') {
			if (!isRecord(raw))
				throw new RoutingRefusal(`the collection '${here.join('.')}' is not a list of members`);
			for (const member of listOf(property.options)) {
				if (
					isRecord(member) &&
					Object.hasOwn(raw, String(member.name)) &&
					member.type !== undefined
				)
					this.property(member, here, own, keys);
			}
		} else if (property.type === 'fixedCollection') {
			const multiple = recordOf(property.typeOptions)?.multipleValues === true;
			for (const group of listOf(property.options)) {
				if (!isRecord(group)) continue;
				const groupPath = [...here, String(group.name)];
				const stored = at(this.input.parameters, groupPath);
				if (stored === undefined) continue;
				if (typeof stored === 'string')
					throw new RoutingRefusal(`the collection '${groupPath.join('.')}' is an expression`);
				if (Array.isArray(stored) !== multiple)
					throw new RoutingRefusal(`the collection '${groupPath.join('.')}' has another shape`);
				const count = Array.isArray(stored) ? stored.length : 1;
				for (let index = 0; index < count; index++) {
					const entryPath = multiple ? [...groupPath, index] : groupPath;
					const parent = this.fresh('parent');
					this.emit(`const ${parent}: any = ${this.read(entryPath)};`);
					for (const option of listOf(group.values)) {
						if (isRecord(option))
							this.property(option, entryPath, own, { ...keys, index: String(index), parent });
					}
				}
			}
		}
	}
}

function postCode(writer: RoutedWriter, response: string, items: string, indent: string): string[] {
	const lines: string[] = [];
	const emit = (line: string) => lines.push(`${indent}${line}`);
	const dynamic = writer.groups.flatMap((group) => group.actions.map((action) => action.enabled));
	const always = dynamic.some((enabled) => enabled === undefined);
	const plain = `if (Array.isArray(${response}.body)) ${items} = ${response}.body.map((json: any) => ({ json }));`;
	emit(`let ${items}: any[] = [{ json: ${response}.body }];`);
	if (dynamic.length === 0) {
		emit(plain);
		return lines;
	}
	if (!always) {
		emit(`if (!(${dynamic.join(' || ')})) {`);
		emit(`\t${plain}`);
		emit('}');
	}
	for (const group of writer.groups) {
		for (const { hook, action, enabled } of group.actions) {
			const base = writer.scope({ value: group.value, response });
			const each = writer.scope({ value: group.value, response, responseItem: 'item.json' });
			let step: string;
			if (hook !== undefined) {
				step = `${items} = await ${hook}.call(this, i, ${items}, ${response});`;
			} else {
				const properties = recordOf(action?.properties) ?? {};
				switch (action?.type) {
					case 'rootProperty':
						step = `${items} = ${items}.flatMap((item: any) => { const content: any = get(item.json, ${routingLiteral(properties.property)}); return (Array.isArray(content) ? content : [content]).map((json: any) => ({ json })); });`;
						break;
					case 'filter':
						step = `${items} = ${items}.filter((item: any) => ${routingValue(properties.pass, each)});`;
						break;
					case 'limit':
						step = `${items} = ${items}.slice(0, parseInt(String(${routingValue(properties.maxResults, base)}), 10));`;
						break;
					case 'set':
						step = `${items} = [{ json: ${routingValue(properties.value, base)} }];`;
						break;
					case 'sort': {
						const key = routingLiteral(properties.key);
						step = `${items}.sort((a: any, b: any) => { const left = a.json[${key}]?.toString().toLowerCase() ?? ''; const right = b.json[${key}]?.toString().toLowerCase() ?? ''; return left < right ? -1 : left > right ? 1 : 0; });`;
						break;
					}
					case 'setKeyValue': {
						const members = Object.entries(properties).map(
							([key, value]) => `${JSON.stringify(key)}: ${routingValue(value, each)}`,
						);
						step = `${items} = ${items}.map((item: any) => ({ json: { ${members.join(', ')} } }));`;
						break;
					}
					case 'binaryData':
						throw new RoutingRefusal("the postReceive action 'binaryData'");
					default:
						step = `${items} = [];`;
				}
			}
			emit(enabled === undefined ? step : `if (${enabled}) { ${step} }`);
		}
	}
	return lines;
}

function requestCode(credentialType: string | undefined, options: string): string {
	return credentialType === undefined
		? `await this.helpers.httpRequest(routingRequest(${options}))`
		: `await this.helpers.httpRequestWithAuthentication.call(this, ${JSON.stringify(credentialType)}, routingRequest(${options}))`;
}

function paginationCode(
	writer: RoutedWriter,
	credentialType: string | undefined,
	indent: string,
): string[] {
	const pagination = writer.pagination;
	if (typeof pagination === 'function') throw new RoutingRefusal('pagination by a function');
	const lines: string[] = [];
	const emit = (line: string) => lines.push(`${indent}${line}`);
	const properties = recordOf(recordOf(pagination)?.properties) ?? {};
	const type = recordOf(pagination)?.type;
	emit('if (!requestOptions.qs) requestOptions.qs = {};');
	if (type === 'generic') {
		const scope = writer.scope({ request: 'requestOptions', response: 'pageResponse' });
		emit('let pageResponse: any = {};');
		emit('let more: any = false;');
		emit('do {');
		emit(`\tconst pageRequest: any = ${routingValue(properties.request, scope)};`);
		emit(
			`\tpageResponse = ${requestCode(credentialType, '{ ...requestOptions, ...pageRequest }')};`,
		);
		lines.push(...postCode(writer, 'pageResponse', 'pageItems', `${indent}\t`));
		emit('\tfor (const pageItem of pageItems) responseItems.push(pageItem);');
		emit(`\tmore = ${routingValue(properties.continue, scope)};`);
		emit('} while (more);');
	} else if (type === 'offset') {
		const holder = properties.type === 'body' ? 'body' : 'qs';
		const limit = routingLiteral(properties.limitParameter);
		const offset = routingLiteral(properties.offsetParameter);
		const size = routingLiteral(properties.pageSize);
		if (typeof properties.pageSize !== 'number')
			throw new RoutingRefusal('offset pagination without a page size');
		if (holder === 'body') emit('if (!requestOptions.body) requestOptions.body = {};');
		emit(`requestOptions.${holder}[${limit}] = ${size};`);
		emit(`requestOptions.${holder}[${offset}] = 0;`);
		emit('let pageLength = 0;');
		emit('do {');
		emit('\tif (maxResults) {');
		emit('\t\tconst missing = maxResults - responseItems.length;');
		emit('\t\tif (missing < 1) break;');
		emit(`\t\trequestOptions.${holder}[${limit}] = Math.min(${size}, missing);`);
		emit('\t}');
		emit(`\tconst pageResponse: any = ${requestCode(credentialType, 'requestOptions')};`);
		lines.push(...postCode(writer, 'pageResponse', 'pageItems', `${indent}\t`));
		emit(`\trequestOptions.${holder}[${offset}] = requestOptions.${holder}[${offset}] + ${size};`);
		emit('\tlet pageData: any[] = pageItems;');
		if (properties.rootProperty) {
			const root = routingLiteral(properties.rootProperty);
			emit(`\tconst pageRoot: any = get(pageItems[0].json, ${root});`);
			emit(
				`\tif (pageRoot === undefined) throw new NodeOperationError(this.getNode(), ${routingLiteral(`The rootProperty "${String(properties.rootProperty)}" could not be found on item.`)}, { itemIndex: i });`,
			);
			emit('\tpageData = pageRoot.map((json: any) => ({ json }));');
		}
		emit('\tfor (const pageItem of pageData) responseItems.push(pageItem);');
		emit('\tpageLength = pageData.length;');
		emit(`} while (pageLength > 0 && pageLength === ${size});`);
	}
	return lines;
}

function credentialTypeOf(input: RoutedInput): string | undefined {
	const credentials = listOf(Reflect.get(input.description, 'credentials')).filter(isRecord);
	if (credentials.length === 0) return undefined;
	let chosen: Json | undefined = credentials[0];
	if (credentials.length > 1) {
		const method = input.parameters.authentication;
		if (hasExpression(method))
			throw new RoutingRefusal("the parameter 'authentication' is an expression");
		chosen = credentials.find((credential) =>
			listOf(recordOf(recordOf(credential.displayOptions)?.show)?.authentication).includes(method),
		);
		if (!chosen) throw new RoutingRefusal('no credential type for the authentication method');
	}
	const name = String(chosen.name);
	if (chosen.required !== true && !input.hasCredential(name))
		throw new RoutingRefusal(`the optional credential '${name}' is not set`);
	return name;
}

const REQUEST_KEYS = new Set([
	'method',
	'url',
	'baseURL',
	'headers',
	'qs',
	'body',
	'json',
	'returnFullResponse',
	'ignoreHttpStatusErrors',
	'timeout',
]);

function checkRequestKey(key: string) {
	if (!REQUEST_KEYS.has(key)) throw new RoutingRefusal(`the request option '${key}'`);
}

const MERGE_HELPER = String.raw`function routingUrl(base: any, url: any): any {
	if (!base || (typeof url === 'string' && /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url))) return url;
	return url ? base.replace(/\/?\/$/, '') + '/' + url.replace(/^\/+/, '') : base;
}

function routingRequest(options: any): any {
	const { baseURL, ...rest } = options;
	return { ...rest, url: routingUrl(baseURL, options.url) };
}

function routingIsPlain(value: any): boolean {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function routingMerge(target: any, source: any): any {
	for (const key of Object.keys(source)) {
		const value = source[key];
		if (Array.isArray(value)) {
			if (!Array.isArray(target[key])) target[key] = routingIsPlain(target[key]) ? target[key] : [];
			routingMerge(target[key], value);
		} else if (routingIsPlain(value)) {
			if (!routingIsPlain(target[key]) && !Array.isArray(target[key])) target[key] = {};
			routingMerge(target[key], value);
		} else if (value !== undefined || !(key in target)) {
			target[key] = value;
		}
	}
	return target;
}
`;

function generate(input: RoutedInput, path: string): string {
	const settings = input.parameters.requestOptions;
	if (
		hasExpression(settings) ||
		REQUEST_SETTINGS.some((key) => isRecord(settings) && key in settings)
	)
		throw new RoutingRefusal(
			"the parameter 'requestOptions' sets a batch, proxy, timeout or certificate option",
		);
	const credentialType = credentialTypeOf(input);
	const writer = new RoutedWriter(input, credentialType);
	const defaults = recordOf(Reflect.get(input.description, 'requestDefaults')) ?? {};
	const head: string[] = [];
	const defaultScope = writer.scope({});
	for (const [key, raw] of Object.entries(defaults)) {
		checkRequestKey(key);
		head.push(`requestOptions[${JSON.stringify(key)}] = ${routingValue(raw, defaultScope)};`);
	}
	for (const property of input.description.properties) {
		if (isRecord(property)) writer.property(property, [], 'requestOptions', {});
	}
	const paged = writer.pagination !== undefined && writer.mayPaginate;
	const post = postCode(writer, 'response', 'responseItems', '\t\t\t\t\t');
	const pages = paged ? paginationCode(writer, credentialType, '\t\t\t\t\t') : [];
	const imports = [...writer.hooks].map(([name, file]) => {
		const specifier = relative(dirname(path), file).replace(/\.ts$/, '');
		return `import { ${name} } from ${JSON.stringify(specifier.startsWith('.') ? specifier : `./${specifier}`)};`;
	});
	const tab = (lines: string[], indent: string) => lines.map((line) => `${indent}${line}`);
	return [
		"import get from 'lodash/get';",
		"import set from 'lodash/set';",
		"import { NodeApiError, NodeOperationError } from 'n8n-workflow';",
		...imports,
		'',
		ROUTING_TEXT_HELPERS,
		MERGE_HELPER,
		'export class RoutedNode {',
		'\tasync execute(this: any): Promise<any[][]> {',
		'\t\tconst items = this.getInputData();',
		'\t\tconst returnData: any[] = [];',
		...(credentialType === undefined
			? []
			: [
					`\t\tconst credentials: any = await this.getCredentials(${JSON.stringify(credentialType)});`,
				]),
		'\t\tconst outcomes: any[] = [];',
		'\t\tfor (let i = 0; i < items.length; i++) {',
		'\t\t\tlet requestOptions: any = { qs: {}, body: {}, headers: {} };',
		'\t\t\tlet paginate: any = undefined;',
		'\t\t\tlet maxResults: any = undefined;',
		'\t\t\ttry {',
		...tab(head, '\t\t\t\t'),
		...tab(writer.build, '\t\t\t\t'),
		'\t\t\t\trequestOptions.timeout = 300000;',
		'\t\t\t} catch (error) {',
		'\t\t\t\tconst failure: any = error instanceof NodeApiError || error instanceof NodeOperationError ? error : new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });',
		'\t\t\t\tif (this.continueOnFail()) {',
		'\t\t\t\t\toutcomes.push({ items: [{ json: {}, error: failure }] });',
		'\t\t\t\t\tcontinue;',
		'\t\t\t\t}',
		'\t\t\t\tthrow failure;',
		'\t\t\t}',
		'\t\t\ttry {',
		...writer.preSend.map(
			(hook) => `\t\t\t\trequestOptions = await ${hook}.call(this, i, requestOptions);`,
		),
		'\t\t\t\trequestOptions.returnFullResponse = true;',
		...(paged
			? [
					'\t\t\t\tif (paginate) {',
					'\t\t\t\t\tconst responseItems: any[] = [];',
					...pages,
					'\t\t\t\t\toutcomes.push({ items: responseItems, maxResults });',
					'\t\t\t\t} else {',
				]
			: ['\t\t\t\t{']),
		`\t\t\t\t\tconst response: any = ${requestCode(credentialType, 'requestOptions')};`,
		...post,
		'\t\t\t\t\toutcomes.push({ items: responseItems, maxResults });',
		'\t\t\t\t}',
		'\t\t\t} catch (error) {',
		'\t\t\t\toutcomes.push({ error });',
		'\t\t\t}',
		'\t\t}',
		'\t\tfor (let i = 0; i < items.length; i++) {',
		'\t\t\tconst outcome: any = outcomes[i];',
		'\t\t\tif (outcome.error !== undefined) {',
		'\t\t\t\tconst error: any = outcome.error;',
		'\t\t\t\tif (error.statusCode === 429) error.message = "Try spacing your requests out using the batching settings under \'Options\'";',
		"\t\t\t\tconst failure: any = error instanceof NodeApiError || error instanceof NodeOperationError ? error : new NodeApiError(this.getNode(), error, { itemIndex: i, message: error?.message, description: error?.description, httpCode: error.isAxiosError && error.response ? String(error.response?.status) : 'none' });",
		'\t\t\t\tif (this.continueOnFail()) {',
		'\t\t\t\t\treturnData.push({ json: {}, error: failure, pairedItem: { item: i } });',
		'\t\t\t\t\tcontinue;',
		'\t\t\t\t}',
		'\t\t\t\tthrow failure;',
		'\t\t\t}',
		'\t\t\tconst responseItems: any[] = outcome.items;',
		'\t\t\tif (outcome.maxResults) responseItems.splice(outcome.maxResults);',
		'\t\t\tfor (const item of responseItems) returnData.push({ ...item, pairedItem: item.pairedItem ?? { item: i } });',
		'\t\t}',
		'\t\treturn [returnData];',
		'\t}',
		'}',
		'',
	].join('\n');
}

export function routedEntry(input: RoutedInput): RoutedEntry | { errors: string[] } {
	const path = join(dirname(input.entry), '__routed.node.ts');
	const refusals: string[] = [];
	let source: string;
	try {
		source = generate(input, path);
	} catch (error) {
		if (!(error instanceof RoutingRefusal)) throw error;
		return { errors: [`the routing of the node stays in the host: ${error.message}`] };
	}
	const rewritten = new Map<string, string | undefined>();
	const readFile: ReadFile = (file) => {
		if (file === path) return source;
		if (rewritten.has(file)) return rewritten.get(file);
		const text = input.readFile(file);
		const out =
			text === undefined
				? undefined
				: singleItemSource(file, text, input.readFile, (reason) => refusals.push(reason));
		if (rewritten.size < MAX_FILES) rewritten.set(file, out);
		return out;
	};
	return { entry: path, readFile, refusals };
}
