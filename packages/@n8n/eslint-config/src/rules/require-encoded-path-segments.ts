import { ASTUtils, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'encodePathSegment';
type Options = [{ helpers?: string[]; trustApiResponses?: boolean }?];

/** A value stored under one of these names is treated as a request path. */
const PATH_SINKS = new Set(['endpoint', 'endPoint', 'url', 'uri', 'path']);

/**
 * These names hold a request path in many nodes too, but also the name of a
 * resource type or a fixed route. A value under them is reported only when it
 * comes from workflow input.
 */
const INPUT_PATH_SINKS = new Set(['resource', 'route']);

/**
 * A name that ends like this also holds a request path (`getEndpoint`,
 * `itemPath`, `endpoints`). Such a name is common for file system paths too, so
 * it counts only when the value starts like a URL path: `/…` or `${base}/…`.
 */
const PATH_SINK_SUFFIX = /[a-z](?:Url|URL|Uri|Endpoint|EndPoint|Path|Route)s?$|^endpoints$/;

/**
 * A parameter of a request helper with one of these names is a whole path,
 * not a segment: `${baseUrl}/api/${endpoint}` in `xApiRequest`. Its segments
 * were the caller's job, and the rule checks the caller. The same name on any
 * other function, or on a local binding, earns no trust.
 */
const PATH_NAMES = new Set(['endpoint', 'endPoint', 'path', 'resource', 'uri', 'url']);

/** A function whose name matches this receives the request path as an argument. */
const REQUEST_CALL = /apirequest|httprequest/i;

/**
 * A value at the start of a path with a name like this is the base URL, not a
 * segment: `${baseUrl}/users`, `${credentials.domain}/api`.
 */
const BASE_NAME = /(?:url|uri|host|hostname|domain|origin|base|server|root)$/i;

/**
 * The sanctioned encoders, by imported name and module. `encodeURI` and
 * `encodeURIComponent` are absent on purpose: the first keeps `/`, `?` and
 * `#`, and both pass `.`, `..` and `''` through unchanged, which path
 * normalisation then removes.
 */
const ENCODERS = new Set(['toPathSegment']);
const ENCODER_MODULE = 'n8n-workflow';

/** Globals that yield a value which cannot contain a path delimiter. */
const SAFE_GLOBALS = new Set(['Number', 'parseInt', 'parseFloat']);

/**
 * Node parameters that cannot hold an expression. The nodes lint config
 * requires `noDataExpression` on both, so their value is always one of the
 * listed options.
 */
const FIXED_PARAMETERS = new Set(['resource', 'operation']);

/**
 * A property name like this holds an identifier the API generated. Such a value
 * from an API response, or from static data the node wrote, is trusted. A name
 * or a title from the same response is not: a user of the service may have
 * chosen it.
 */
const ID_PROPERTY = /^(?:id|uuid|sid|_id|[a-z][A-Za-z]*Id|[a-z]+_id)$/;

/** String methods that keep a trusted value trusted. */
const TRANSPARENT_METHODS = new Set(['trim', 'toString', 'toLowerCase', 'toUpperCase']);

/** Array methods whose callback receives the elements of the array. */
const ELEMENT_CALLBACKS = new Set(['map', 'flatMap', 'forEach', 'filter', 'find', 'some', 'every']);

/** How far to follow bindings back to their initialiser. */
const MAX_BINDING_DEPTH = 5;

/** How far to follow a value back to workflow input. A miss here only hides a report. */
const MAX_INPUT_DEPTH = 8;

type GetScope = (
	node: TSESTree.Node,
) => ReturnType<RuleContext<MessageIds, Options>['sourceCode']['getScope']>;

interface Context {
	helpers: Set<string>;
	trustApiResponses: boolean;
	getScope: GetScope;
}

/** Where an object comes from, when it comes from somewhere the node trusts. */
type Origin = 'credentials' | 'response' | 'staticData';

/** A value that is interpolated into or concatenated with a URL. */
type ValuePart = {
	node: TSESTree.Node;
	/** Declarative only: the value never holds workflow input. */
	neutral?: boolean;
	/** Declarative only: the value is a node parameter, as is. */
	direct?: boolean;
	/** Declarative only: the value is a `toPathSegment(…)` call. */
	encoded?: boolean;
	/** The value starts the path, where a base URL usually is. */
	atStart?: boolean;
	/** The value follows fixed text in a segment: `/users-${id}`, `/accounts(${id})`. */
	midSegment?: boolean;
};

/** A piece of a URL: fixed text, or a value. */
type Part = { text: string } | ValuePart;

function unwrap(node: TSESTree.Node): TSESTree.Node {
	let current = node;
	while (
		current.type === 'TSAsExpression' ||
		current.type === 'TSNonNullExpression' ||
		current.type === 'TSSatisfiesExpression' ||
		current.type === 'AwaitExpression'
	) {
		current = current.type === 'AwaitExpression' ? current.argument : current.expression;
	}
	return current;
}

/** The value under TypeScript-only wrappers, which do not change it at runtime. */
function unwrapTypes(node: TSESTree.Node): TSESTree.Node {
	let current = node;
	while (
		current.type === 'TSAsExpression' ||
		current.type === 'TSNonNullExpression' ||
		current.type === 'TSSatisfiesExpression'
	) {
		current = current.expression;
	}
	return current;
}

function memberName(node: TSESTree.MemberExpression): string | undefined {
	if (!node.computed && node.property.type === 'Identifier') return node.property.name;
	if (
		node.computed &&
		node.property.type === 'Literal' &&
		typeof node.property.value === 'string'
	) {
		return node.property.value;
	}
	return undefined;
}

function keyName(key: TSESTree.Node): string | undefined {
	if (key.type === 'Identifier') return key.name;
	if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
	return undefined;
}

/** `this.getCredentials(…)` or `this.getWorkflowStaticData(…)`. */
function contextCall(node: TSESTree.Node, method: string): boolean {
	const call = unwrap(node);
	if (call.type !== 'CallExpression') return false;
	const callee = call.callee;
	return (
		callee.type === 'MemberExpression' &&
		memberName(callee) === method &&
		callee.object.type === 'ThisExpression'
	);
}

/** The name in `this.getNodeParameter('name', i)`, if the call reads a node parameter. */
function parameterName(node: TSESTree.CallExpression): string | undefined {
	const callee = node.callee;
	if (callee.type !== 'MemberExpression') return undefined;
	const method = memberName(callee);
	if (method !== 'getNodeParameter' && method !== 'getCurrentNodeParameter') return undefined;
	const [name] = node.arguments;
	return name?.type === 'Literal' && typeof name.value === 'string' ? name.value : undefined;
}

/** `this.getNodeParameter('resource', i)`: a parameter that never holds an expression. */
function isFixedParameter(node: TSESTree.CallExpression): boolean {
	const name = parameterName(node);
	return name !== undefined && FIXED_PARAMETERS.has(name);
}

/** An `Identifier`'s initialiser and later writes, or `undefined` when it has none to read. */
function writesOf(
	identifier: TSESTree.Identifier,
	ctx: Context,
):
	| {
			writes: TSESTree.Node[];
			definition: NonNullable<ReturnType<typeof ASTUtils.findVariable>>['defs'][number];
	  }
	| undefined {
	const variable = ASTUtils.findVariable(ctx.getScope(identifier), identifier.name);
	if (!variable || variable.defs.length !== 1) return undefined;
	const [definition] = variable.defs;
	const writes = variable.references
		.filter((reference) => reference.isWrite() && reference.writeExpr)
		.map((reference) => reference.writeExpr as TSESTree.Node);
	return { writes, definition };
}

/** Whether a function is a callback over the elements of an array: `list.map((x) => …)`. */
function elementSource(fn: TSESTree.Node): TSESTree.Node | undefined {
	const call = fn.parent;
	if (call?.type !== 'CallExpression' || call.arguments[0] !== fn) return undefined;
	if (call.callee.type !== 'MemberExpression') return undefined;
	const method = memberName(call.callee);
	return method && ELEMENT_CALLBACKS.has(method) ? call.callee.object : undefined;
}

/** An initial value that only reserves a binding: `{}`, `[]`, `''`, `null`, `undefined`. */
function isPlaceholder(node: TSESTree.Node): boolean {
	const value = unwrap(node);
	if (value.type === 'ObjectExpression' || value.type === 'ArrayExpression') {
		return value.type === 'ObjectExpression'
			? value.properties.length === 0
			: value.elements.length === 0;
	}
	if (value.type === 'Literal') return value.value === null || value.value === '';
	return value.type === 'Identifier' && value.name === 'undefined';
}

/** Where the object at the root of a member chain comes from. */
function originOf(node: TSESTree.Node, ctx: Context, depth = 0): Origin | undefined {
	if (depth >= MAX_BINDING_DEPTH) return undefined;
	const value = unwrap(node);

	if (contextCall(value, 'getCredentials')) return 'credentials';
	if (contextCall(value, 'getWorkflowStaticData')) return 'staticData';
	if (value.type === 'CallExpression' && isRequestCall(value)) return 'response';
	if (value.type === 'MemberExpression') return originOf(value.object, ctx, depth + 1);
	if (value.type !== 'Identifier') return undefined;

	const found = writesOf(value, ctx);
	if (!found) return value.name === 'credentials' ? 'credentials' : undefined;
	const { writes, definition } = found;

	if (definition.type === 'Parameter') {
		const source = elementSource(definition.node);
		return source ? originOf(source, ctx, depth + 1) : undefined;
	}
	if (definition.type !== 'Variable') return undefined;

	// `for (const item of response.items)`
	const loop = definition.node.parent?.parent;
	if (loop?.type === 'ForOfStatement') return originOf(loop.right, ctx, depth + 1);

	// `let responseData = {};` before the request does not change where the value comes from.
	const origins = new Set(
		writes.filter((write) => !isPlaceholder(write)).map((write) => originOf(write, ctx, depth + 1)),
	);
	if (origins.size !== 1) return undefined;
	return [...origins][0];
}

/**
 * The result of a call like this is an API response: `xApiRequest.call(…)`,
 * `this.helpers.request(…)`, `xRequestAllItems(…)`, `handleListing(…)`.
 */
const RESPONSE_CALL =
	/apirequest|httprequest|^request(?:WithAuthentication|OAuth[12])?$|allitems|paginat|listing/i;

function calleeName(callee: TSESTree.Node): string | undefined {
	if (callee.type === 'Identifier') return callee.name;
	if (callee.type !== 'MemberExpression') return undefined;
	const property = memberName(callee);
	if ((property === 'call' || property === 'apply') && callee.object.type === 'Identifier') {
		return callee.object.name;
	}
	return property;
}

/** A call whose result is an API response. */
function isRequestCall(node: TSESTree.CallExpression): boolean {
	const name = calleeName(node.callee);
	return name !== undefined && RESPONSE_CALL.test(name);
}

/** An object literal whose values are all fixed, so any lookup in it is fixed too. */
function isConstantTable(node: TSESTree.Node, ctx: Context): boolean {
	if (node.type !== 'Identifier') return false;
	const found = writesOf(node, ctx);
	if (!found || found.definition.type !== 'Variable') return false;
	if (found.definition.parent.kind !== 'const') return false;
	const init =
		found.definition.node.type === 'VariableDeclarator' ? found.definition.node.init : null;
	if (!init) return false;
	const table = unwrap(init);
	return (
		table.type === 'ObjectExpression' &&
		table.properties.every(
			(property) =>
				property.type === 'Property' &&
				(property.value.type === 'Literal' ||
					(property.value.type === 'TemplateLiteral' && property.value.expressions.length === 0)),
		)
	);
}

function isNeutralised(node: TSESTree.Node, ctx: Context, depth = 0): boolean {
	// Report rather than pass when the chain gets too long to follow: an unread
	// value is not a safe one.
	if (depth >= MAX_BINDING_DEPTH) return false;

	switch (node.type) {
		case 'Literal':
			return true;

		case 'TemplateLiteral':
			return node.expressions.every((expression) => isNeutralised(expression, ctx, depth + 1));

		case 'CallExpression': {
			if (isFixedParameter(node)) return true;

			// `value.trim()` is as trusted as `value`.
			if (node.callee.type === 'MemberExpression') {
				const method = memberName(node.callee);
				return (
					method !== undefined &&
					TRANSPARENT_METHODS.has(method) &&
					isNeutralised(node.callee.object, ctx, depth + 1)
				);
			}

			// Only a bare call counts. `helpers.toPathSegment(x)` carries an approved
			// name but proves nothing about what it calls.
			if (node.callee.type !== 'Identifier') return false;

			const variable = ASTUtils.findVariable(ctx.getScope(node.callee), node.callee.name);
			if (!variable || variable.defs.length === 0) {
				return SAFE_GLOBALS.has(node.callee.name);
			}

			// Match the name the helper is exported under rather than its local
			// spelling, so an alias still counts and a same-named local does not.
			const binding = variable.defs.find((definition) => definition.type === 'ImportBinding');
			if (binding === undefined) return false;
			const specifier = binding.node;
			if (specifier.type !== 'ImportSpecifier' || specifier.imported.type !== 'Identifier') {
				return false;
			}

			const name = specifier.imported.name;
			if (ENCODERS.has(name)) {
				return (
					binding.parent.type === 'ImportDeclaration' &&
					binding.parent.source.value === ENCODER_MODULE
				);
			}
			return ctx.helpers.has(name);
		}

		case 'MemberExpression': {
			const origin = originOf(node.object, ctx);
			if (origin === 'credentials') return true;
			if (origin === 'staticData' || (origin === 'response' && ctx.trustApiResponses)) {
				const name = memberName(node);
				if (name !== undefined && ID_PROPERTY.test(name)) return true;
			}

			// `endpoints[operation]` from a table of fixed paths.
			if (node.computed) return isConstantTable(node.object, ctx);

			// Assumed fixed at build time. Proving it would need cross-file analysis, so
			// an import initialised from a runtime call is accepted here — same
			// assumption as require-escaped-query-values.
			return isNeutralised(node.object, ctx, depth + 1);
		}

		case 'Identifier': {
			const found = writesOf(node, ctx);
			if (!found) return false;
			const { writes, definition } = found;

			if (definition.type === 'ImportBinding') return true;

			// `const { appId } = await this.getCredentials(…)`, `const { id } = response`.
			const origin = originOf(node, ctx);
			if (origin === 'credentials') return true;
			if (
				(origin === 'staticData' || (origin === 'response' && ctx.trustApiResponses)) &&
				ID_PROPERTY.test(node.name)
			) {
				return true;
			}

			if (definition.type === 'Parameter') {
				return PATH_NAMES.has(node.name) && isRequestFunction(definition.node);
			}
			if (definition.type !== 'Variable') return false;

			// A binding is as trusted as every value ever written to it.
			return writes.length > 0 && writes.every((write) => isNeutralised(write, ctx, depth + 1));
		}

		case 'ConditionalExpression':
			return (
				isNeutralised(node.consequent, ctx, depth + 1) &&
				isNeutralised(node.alternate, ctx, depth + 1)
			);

		case 'LogicalExpression':
			return isNeutralised(node.left, ctx, depth + 1) && isNeutralised(node.right, ctx, depth + 1);

		case 'BinaryExpression':
			return (
				node.operator === '+' &&
				isNeutralised(node.left, ctx, depth + 1) &&
				isNeutralised(node.right, ctx, depth + 1)
			);

		// TypeScript-only wrappers that do not change the runtime value.
		case 'TSAsExpression':
		case 'TSNonNullExpression':
		case 'TSSatisfiesExpression':
			return isNeutralised(node.expression, ctx, depth + 1);

		default:
			return false;
	}
}

/**
 * Whether a value comes from workflow input: a node parameter, or a field of an
 * input item. Calls and string methods pass their argument through, so
 * `decodeOnce(id)` and `id.trim()` are input when `id` is.
 */
function isUserInput(node: TSESTree.Node, ctx: Context, depth = 0): boolean {
	if (depth >= MAX_INPUT_DEPTH) return false;
	// An awaited call fetches data: its result is not the input it was given.
	if (unwrapTypes(node).type === 'AwaitExpression') return false;
	const value = unwrap(node);

	switch (value.type) {
		case 'CallExpression': {
			const callee = value.callee;
			if (callee.type === 'MemberExpression') {
				const method = memberName(callee);
				if (method === 'getNodeParameter' || method === 'getCurrentNodeParameter') {
					return !isFixedParameter(value);
				}
				if (method === 'getInputData') return true;
				if (method !== undefined && TRANSPARENT_METHODS.has(method)) {
					return isUserInput(callee.object, ctx, depth + 1);
				}
			}
			// The output of an encoder is safe, even when its input was not.
			if (isNeutralised(value, ctx)) return false;
			return value.arguments.some((argument) => isUserInput(argument, ctx, depth + 1));
		}
		case 'MemberExpression':
			return isUserInput(value.object, ctx, depth + 1);
		case 'Identifier': {
			if (value.name === 'items') return true;
			const found = writesOf(value, ctx);
			if (!found) return false;
			if (found.definition.type === 'Parameter') {
				const source = elementSource(found.definition.node);
				return source !== undefined && isUserInput(source, ctx, depth + 1);
			}
			const loop = found.definition.node.parent?.parent;
			if (loop?.type === 'ForOfStatement') return isUserInput(loop.right, ctx, depth + 1);
			return found.writes.some((write) => isUserInput(write, ctx, depth + 1));
		}
		case 'TemplateLiteral':
			return value.expressions.some((expression) => isUserInput(expression, ctx, depth + 1));
		case 'BinaryExpression':
		case 'LogicalExpression':
			return isUserInput(value.left, ctx, depth + 1) || isUserInput(value.right, ctx, depth + 1);
		case 'ConditionalExpression':
			return (
				isUserInput(value.consequent, ctx, depth + 1) ||
				isUserInput(value.alternate, ctx, depth + 1)
			);
		default:
			return false;
	}
}

/** `encodeURIComponent(x)` or `encodeURI(x)`: both pass `.` and `..` through. */
function isLegacyEncoding(node: TSESTree.Node): boolean {
	const value = unwrap(node);
	return (
		value.type === 'CallExpression' &&
		value.callee.type === 'Identifier' &&
		(value.callee.name === 'encodeURIComponent' || value.callee.name === 'encodeURI')
	);
}

/** The name a function is declared, assigned, or keyed under, if any. */
function functionName(node: TSESTree.Node): string | undefined {
	if (node.type === 'FunctionDeclaration' && node.id) return node.id.name;
	const parent = node.parent;
	if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
		return parent.id.name;
	}
	if (parent?.type === 'Property' || parent?.type === 'MethodDefinition') {
		return keyName(parent.key);
	}
	return undefined;
}

function isRequestFunction(node: TSESTree.Node): boolean {
	const name = functionName(node);
	return name !== undefined && REQUEST_CALL.test(name);
}

function isRequestCallee(callee: TSESTree.Node): boolean {
	if (callee.type === 'Identifier') return REQUEST_CALL.test(callee.name);
	if (callee.type !== 'MemberExpression') return false;

	// `xApiRequest.call(this, ...)` or `this.helpers.httpRequest(...)`.
	const property = memberName(callee);
	if (property === 'call' || property === 'apply') {
		return callee.object.type === 'Identifier' && REQUEST_CALL.test(callee.object.name);
	}
	return property !== undefined && REQUEST_CALL.test(property);
}

/**
 * A function of the node itself: declared in this file or imported from a
 * relative module (`./GenericFunctions`, `../transport`). Request helpers have
 * many names (`handleListing`, `getVersionForUpdate`, `xRequestAllItems`), so
 * their location identifies them better than their name.
 */
function isLocalFunction(callee: TSESTree.Node, ctx: Context): boolean {
	let target = callee;
	if (target.type === 'MemberExpression') {
		const property = memberName(target);
		if (property !== 'call' && property !== 'apply') return false;
		target = target.object;
	}
	if (target.type !== 'Identifier') return false;

	const variable = ASTUtils.findVariable(ctx.getScope(target), target.name);
	const definition = variable?.defs[0];
	if (!definition) return false;
	if (definition.type === 'FunctionName') return true;
	if (definition.type === 'ImportBinding') {
		const source =
			definition.parent.type === 'ImportDeclaration' ? definition.parent.source.value : '';
		return typeof source === 'string' && source.startsWith('.');
	}
	if (definition.type === 'Variable' && definition.node.type === 'VariableDeclarator') {
		const init = definition.node.init;
		return init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression';
	}
	return false;
}

/**
 * Climbs past expressions that only choose between values or append to a
 * string, so a path reached through one — `url: isV2 ? \`...\` : \`...\``,
 * `url + \`/...\`` — is still recognised.
 */
function effectiveParent(node: TSESTree.Node): TSESTree.Node | undefined {
	let parent: TSESTree.Node | undefined = node.parent;

	while (
		parent?.type === 'ConditionalExpression' ||
		parent?.type === 'LogicalExpression' ||
		parent?.type === 'TSAsExpression' ||
		parent?.type === 'TSNonNullExpression' ||
		parent?.type === 'TSSatisfiesExpression' ||
		(parent?.type === 'BinaryExpression' && parent.operator === '+')
	) {
		parent = parent.parent;
	}

	return parent;
}

/** A link written to the output or shown in a list, which the node never requests. */
function isDisplayLink(property: TSESTree.Property): boolean {
	const object = property.parent;
	if (object?.type !== 'ObjectExpression') return false;
	const keys = new Set(
		object.properties.map((p) => (p.type === 'Property' ? keyName(p.key) : undefined)),
	);
	if (keys.has('name') && keys.has('value')) return true;

	let current: TSESTree.Node | undefined = object.parent;
	while (current && current.type !== 'Program' && !current.type.startsWith('Function')) {
		if (current.type === 'Property' && keyName(current.key) === 'json') return true;
		current = current.parent;
	}
	return false;
}

/**
 * How a value reaches a request path. A `strict` sink reports every value it
 * cannot prove safe. Any other sink reports only a value that comes from
 * workflow input, because it is sometimes not a request path at all. A
 * `shaped` sink counts only when the value looks like a URL path.
 */
type Sink = { strict: boolean; shaped: boolean } | undefined;

function sinkName(name: string | undefined): Sink {
	if (name === undefined) return undefined;
	if (PATH_SINKS.has(name)) return { strict: true, shaped: false };
	if (INPUT_PATH_SINKS.has(name)) return { strict: false, shaped: false };
	return PATH_SINK_SUFFIX.test(name) ? { strict: false, shaped: true } : undefined;
}

/** Whether the value of `node` is used as a request path, and how sure that is. */
function sinkOf(node: TSESTree.Node, ctx: Context, depth = 0): Sink {
	if (depth > 2) return undefined;
	const parent = effectiveParent(node);
	if (!parent) return undefined;

	switch (parent.type) {
		// `{ url: `...` }`
		case 'Property':
			return isDisplayLink(parent) ? undefined : sinkName(keyName(parent.key));

		// `endpoint = `...`` / `options.uri = `...``
		case 'AssignmentExpression': {
			// `+=` appends to an existing path; the AssignmentExpression visitor checks it.
			if (parent.left === node || parent.operator !== '=') return undefined;
			if (parent.left.type === 'Identifier') return sinkName(parent.left.name);
			if (parent.left.type !== 'MemberExpression') return undefined;
			return sinkName(memberName(parent.left));
		}

		// `const endpoint = `...``
		case 'VariableDeclarator':
			return parent.id.type === 'Identifier' ? sinkName(parent.id.name) : undefined;

		// `xApiRequest.call(this, 'GET', `...`)`
		case 'CallExpression':
			if (parent.callee === node) return undefined;
			if (isRequestCallee(parent.callee)) return { strict: true, shaped: false };
			return isLocalFunction(parent.callee, ctx) ? { strict: false, shaped: true } : undefined;

		// `return `...`` from `documentsPath()` or from `ids.map((id) => `...`)`
		case 'ReturnStatement':
		case 'ArrowFunctionExpression': {
			const fn =
				parent.type === 'ArrowFunctionExpression'
					? parent
					: (function enclosing(n: TSESTree.Node | undefined): TSESTree.Node | undefined {
							while (n && !n.type.includes('Function')) n = n.parent;
							return n;
						})(parent.parent);
			if (!fn) return undefined;
			// A path-named function builds the path from its parameters, so it must encode them.
			const name = functionName(fn);
			if (name !== undefined && sinkName(name) !== undefined) return { strict: true, shaped: true };
			const call = fn.parent;
			if (call?.type === 'CallExpression' && elementSource(fn) !== undefined) {
				return sinkOf(call, ctx, depth + 1) ? { strict: false, shaped: true } : undefined;
			}
			return undefined;
		}

		default:
			return undefined;
	}
}

/** The fixed text and the values of a template or a `+` chain, in order. */
function partsOf(node: TSESTree.Node): Part[] {
	if (node.type === 'TemplateLiteral') {
		const parts: Part[] = [];
		node.quasis.forEach((quasi, index) => {
			parts.push({ text: quasi.value.cooked ?? quasi.value.raw });
			const expression = node.expressions[index];
			if (expression) parts.push({ node: expression });
		});
		return parts;
	}
	if (node.type === 'BinaryExpression' && node.operator === '+') {
		return [...partsOf(node.left), ...partsOf(node.right)];
	}
	if (node.type === 'Literal' && typeof node.value === 'string') return [{ text: node.value }];
	return [{ node }];
}

/**
 * A value at the start of a path that is a base URL or a path built elsewhere.
 * A path-named binding such as `sheetPath` is checked where it is built, so it
 * is not checked again where it is used.
 */
function isBase(node: TSESTree.Node, ctx: Context): boolean {
	const value = unwrap(node);
	const baseName = (name: string | undefined) =>
		name !== undefined && (BASE_NAME.test(name) || sinkName(name) !== undefined);
	// A call that reads workflow input is a segment, unless it reads a parameter
	// with a base name: `this.getNodeParameter('baseUrl', i)`.
	if (value.type === 'CallExpression') {
		return baseName(parameterName(value)) || !isUserInput(value, ctx);
	}
	if (value.type === 'Identifier') return baseName(value.name);
	if (value.type === 'MemberExpression') {
		return baseName(memberName(value)) || originOf(value, ctx) === 'credentials';
	}
	return false;
}

/** Whether the parts start like a URL path: `/…`, `users/…`, or a base URL and then `/…`. */
function looksLikePath(parts: Part[], ctx: Context): boolean {
	const meaningful = parts.filter((part) => !('text' in part) || part.text !== '');
	const [first, second] = meaningful;
	if (!first) return false;
	if ('text' in first) return /^\/|^[A-Za-z0-9_.-]+\/(?!\/)/.test(first.text);
	return (
		isBase(first.node, ctx) &&
		second !== undefined &&
		'text' in second &&
		second.text.startsWith('/')
	);
}

/** The text of a URL after its scheme and host, if it has them. */
const SCHEME_AND_HOST = /^[^/]*:\/\/[^/]*/;

/**
 * The values of `parts` that sit in a path segment: right after a single `/`,
 * right after a value that does, after fixed text in a segment (`midSegment`),
 * or at the start when a `/` follows and the value is not the base URL. Text
 * after `?` or `#` belongs to the query, which is a different concern.
 */
function segmentValues(parts: Part[], ctx: Context, startsAtBase: boolean): ValuePart[] {
	const found: ValuePart[] = [];
	let before = '';
	let text = '';
	let previousInSegment = false;
	let previousIsCall = false;
	let seenAny = startsAtBase;

	parts.forEach((part, index) => {
		if ('text' in part) {
			before += part.text;
			text += part.text;
			if (part.text !== '') previousInSegment = false;
			return;
		}
		if (/[?#]/.test(before)) return;

		let inSegment: boolean;
		let atStart = false;
		let midSegment = false;
		if (text !== '') {
			inSegment = text.endsWith('/') && !text.endsWith('//');
			// `/users-${id}`, `/accounts(${id})`, `/api/v1${id}`: fixed text of the
			// path comes before the value. A port or a host part is not in the path.
			midSegment = !inSegment && before.replace(SCHEME_AND_HOST, '').includes('/');
		} else if (!seenAny) {
			const next = parts[index + 1];
			atStart = true;
			inSegment =
				next !== undefined &&
				'text' in next &&
				next.text.startsWith('/') &&
				!isBase(part.node, ctx);
		} else {
			// `${toPathSegment(a)}${b}` extends the encoded segment with `b`. After a
			// constant, as in `${API_VERSION}${endpoint}`, the value is often a path
			// suffix, so it counts like a value after fixed text: `${version}${node}`.
			inSegment = previousInSegment && previousIsCall;
			midSegment = !inSegment && previousInSegment;
		}

		if (inSegment || midSegment) found.push({ ...part, atStart, midSegment });
		previousInSegment = inSegment || midSegment;
		previousIsCall = part.encoded === true || unwrap(part.node).type === 'CallExpression';
		seenAny = true;
		text = '';
	});

	return found;
}

/** A JS string literal with escapes, so a `)` inside one is not a parenthesis. */
const STRING_LITERAL = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g;

/**
 * Whether an expression-string interpolation is exactly one `toPathSegment(...)`
 * call, so `toPathSegment(a) + '/' + b` does not pass on its prefix.
 */
function isEncoderCall(expression: string): boolean {
	const match = /^\s*toPathSegment\(([\s\S]*)\)\s*$/.exec(expression);
	if (!match) return false;

	let depth = 0;
	for (const char of match[1].replace(STRING_LITERAL, 'x')) {
		if (char === '(') depth++;
		else if (char === ')' && --depth < 0) return false;
	}
	return depth === 0;
}

/** The operands of the top-level `+` in an expression string, outside strings and brackets. */
function splitConcatenation(expression: string): string[] {
	const masked = expression.replace(STRING_LITERAL, (literal) => '\u0000'.repeat(literal.length));
	const operands: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < masked.length; i++) {
		const char = masked[i];
		if ('([{'.includes(char)) depth++;
		else if (')]}'.includes(char)) depth--;
		else if (char === '+' && depth === 0) {
			operands.push(expression.slice(start, i));
			start = i + 1;
		} else if (depth === 0 && (char === '?' || char === '|' || char === '&')) {
			// A choice between values is read as one opaque value.
			return [expression];
		}
	}
	operands.push(expression.slice(start));
	return operands;
}

/** Declarative values that never hold workflow input. */
const DECLARATIVE_NEUTRAL =
	/^\$credentials(?:\.\w+|\[\s*['"][\w]+['"]\s*\])+$|^\$parameter(?:\.|\[\s*['"])(?:resource|operation)['"]?\]?$|^\d+$/;

/** A declarative value that is a node parameter or an input field as the user set it. */
const DECLARATIVE_PARAMETER =
	/^\$value$|^\$parameter(?:\.\w+|\[\s*['"]\w+['"]\s*\])$|^\$json(?:\.\w+|\[\s*['"]\w+['"]\s*\])+$/;

/** The parts of a declarative URL such as `=/users/{{ toPathSegment($parameter.id) }}`. */
function declarativeParts(value: string, node: TSESTree.Node): Part[] {
	const parts: Part[] = [];
	const pattern = /\{\{([\s\S]*?)\}\}/g;
	let last = 1;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(value)) !== null) {
		parts.push({ text: value.slice(last, match.index) });
		for (const raw of splitConcatenation(match[1])) {
			const operand = raw.trim();
			const literal = /^(['"`])([\s\S]*)\1$/.exec(operand);
			if (literal && !literal[2].includes('${')) parts.push({ text: literal[2] });
			else {
				parts.push({
					node,
					neutral: isEncoderCall(operand) || DECLARATIVE_NEUTRAL.test(operand),
					direct: DECLARATIVE_PARAMETER.test(operand),
					encoded: isEncoderCall(operand),
				});
			}
		}
		last = match.index + match[0].length;
	}
	parts.push({ text: value.slice(last) });
	return parts;
}

export const RequireEncodedPathSegmentsRule = ESLintUtils.RuleCreator.withoutDocs<
	Options,
	MessageIds
>({
	meta: {
		type: 'problem',
		docs: {
			// Coverage boundary: the rule inspects a template literal or a `+` chain
			// that lands in a recognised sink: a path-named binding or property, an
			// argument of a request helper or of the node's own functions, or the
			// return value of a path-named function. It does not see a path
			// assembled across statements other than with `+=`, or built with
			// `.replace()`. Those need a test, not this rule.
			description:
				'Require a value interpolated into a URL path segment to go through toPathSegment().',
		},
		schema: [
			{
				type: 'object',
				properties: {
					helpers: {
						type: 'array',
						items: { type: 'string' },
						description: 'Imported helper names accepted in addition to toPathSegment.',
					},
					trustApiResponses: {
						type: 'boolean',
						description:
							'Accept an ID-named property of an API response, such as `response.id`, without encoding.',
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			encodePathSegment:
				'Wrap this value in toPathSegment() from n8n-workflow before you use it as a URL path segment. If the API needs the raw value, add an eslint-disable-next-line directive with the reason after "--".',
		},
	},
	defaultOptions: [{}],
	create(context, [options]) {
		const sourceCode = context.sourceCode;
		const ctx: Context = {
			helpers: new Set(options?.helpers ?? []),
			trustApiResponses: options?.trustApiResponses ?? true,
			getScope: (n) => sourceCode.getScope(n),
		};

		function reportValues(parts: Part[], sink: NonNullable<Sink>, startsAtBase: boolean) {
			for (const part of segmentValues(parts, ctx, startsAtBase)) {
				if (isNeutralised(part.node, ctx)) continue;
				// Only workflow input is reported at the start of a path, which is
				// usually a base URL or a prefix the node built itself, and after fixed
				// text, where a path suffix such as `${API_VERSION}${endpoint}` often
				// is. A value the node already passes through `encodeURI` or
				// `encodeURIComponent` is a segment by the node's own account, so it is
				// always reported. So is a value from an API response that is not an
				// ID, because a user of the service may have chosen it.
				const strict =
					(sink.strict && !part.atStart && !part.midSegment) || isLegacyEncoding(part.node);
				if (strict || isUserInput(part.node, ctx) || originOf(part.node, ctx) === 'response') {
					context.report({ node: part.node, messageId: 'encodePathSegment' });
				}
			}
		}

		function check(root: TSESTree.Node) {
			const sink = sinkOf(root, ctx);
			if (!sink) return;

			const parts = partsOf(root);
			if (!parts.some((part) => 'node' in part)) return;
			if (sink.shaped && !looksLikePath(parts, ctx)) return;
			reportValues(parts, sink, false);
		}

		/** The outermost node of a `+` chain, which is the value the sink receives. */
		function isChainRoot(node: TSESTree.Node): boolean {
			return !(node.parent?.type === 'BinaryExpression' && node.parent.operator === '+');
		}

		return {
			TemplateLiteral(node) {
				if (isChainRoot(node)) check(node);
			},

			BinaryExpression(node) {
				if (node.operator !== '+' || !isChainRoot(node)) return;
				const parts = partsOf(node);
				if (parts.some((part) => 'text' in part && part.text.includes('/'))) check(node);
			},

			// `requestOptions.url += '/' + id`: the value is appended to a path.
			AssignmentExpression(node) {
				if (node.operator !== '+=') return;
				const target =
					node.left.type === 'Identifier'
						? node.left.name
						: node.left.type === 'MemberExpression'
							? memberName(node.left)
							: undefined;
				const sink = sinkName(target);
				if (sink) reportValues(partsOf(node.right), sink, true);
			},

			// Declarative routing: `routing: { request: { url: '=/users/{{ $parameter["id"] }}' } }`.
			// A `url` elsewhere in a description (a resource locator's link mode) is
			// shown to the user, not requested.
			Literal(node) {
				if (typeof node.value !== 'string' || !node.value.startsWith('=')) return;
				const parent = effectiveParent(node);
				if (parent?.type !== 'Property' || keyName(parent.key) !== 'url') return;
				const request = parent.parent?.parent;
				if (request?.type !== 'Property' || keyName(request.key) !== 'request') return;

				const parts = declarativeParts(node.value, node);
				// A computed value at the start, such as a version taken from a base
				// URL option, is not a segment the user sets directly.
				const raw = segmentValues(parts, ctx, false).some(
					(part) => !part.neutral && (!part.atStart || part.direct),
				);
				if (raw) context.report({ node, messageId: 'encodePathSegment' });
			},
		};
	},
});
