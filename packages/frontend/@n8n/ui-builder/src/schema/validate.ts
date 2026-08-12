import { getComponentSpec, regionNamesOf } from './kit-spec';
import {
	ACTION_PROP_TYPE,
	HTTP_METHODS,
	ROUTE_PROP_TYPE,
	STATE_PATH_PROP_TYPE,
	type UiHttpMethod,
	type UiNode,
	type UiProperty,
} from './types';

/** n8n stores expressions as a string with a leading `=`, `{{ }}` inside. */
export function isExpression(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('=');
}

export interface UiDefinitionIssue {
	/** Where in the tree, as a readable path: `frame-1.default[0].props.variant`. */
	path: string;
	message: string;
}

const ACTION_KINDS = new Set(['webhook', 'notify', 'navigate', 'set']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What to call an offending value in a message, without `[object Object]`. */
function show(value: unknown): string {
	if (typeof value === 'string') return value;
	if (value === undefined) return 'undefined';

	// Circular, or a bigint, which JSON refuses. Neither belongs in a definition,
	// so naming the kind is as much as the message needs to do.
	try {
		return JSON.stringify(value) ?? typeof value;
	} catch {
		return typeof value;
	}
}

/**
 * A step chain, or the older `{ url, method }` single call that `normaliseAction`
 * still reads. Anything else is a mistake worth naming.
 */
function checkAction(value: unknown, path: string, issues: UiDefinitionIssue[]): void {
	if (value === undefined || value === '') return;

	if (isRecord(value)) {
		if (typeof value.url !== 'string') {
			issues.push({ path, message: 'Legacy single-call action must have a string `url`' });
		}
		return;
	}

	if (!Array.isArray(value)) {
		issues.push({ path, message: 'An action prop holds an array of steps' });
		return;
	}

	value.forEach((step, index) => {
		const at = `${path}[${index}]`;
		if (!isRecord(step)) {
			issues.push({ path: at, message: 'A step is an object' });
			return;
		}
		if (typeof step.kind !== 'string' || !ACTION_KINDS.has(step.kind)) {
			issues.push({
				path: at,
				message: `Unknown step kind "${String(step.kind)}". Expected one of: ${[...ACTION_KINDS].join(', ')}`,
			});
			return;
		}
		if (step.kind === 'webhook') {
			if (typeof step.url !== 'string') {
				issues.push({ path: `${at}.url`, message: 'A webhook step needs a string `url`' });
			}
			if (step.method !== undefined && !HTTP_METHODS.includes(step.method as UiHttpMethod)) {
				issues.push({
					path: `${at}.method`,
					message: `"${show(step.method)}" is not one of: ${HTTP_METHODS.join(', ')}`,
				});
			}
			// `response` was the old way to place a reply; `normaliseAction` still
			// reads it, so it is legacy rather than wrong.
			if (step.key !== undefined && typeof step.key !== 'string') {
				issues.push({ path: `${at}.key`, message: 'A reply key is a string' });
			}
		}
		if (step.kind === 'notify' && typeof step.message !== 'string') {
			issues.push({ path: `${at}.message`, message: 'A notify step needs a string `message`' });
		}
		if (step.kind === 'navigate' && typeof step.to !== 'string') {
			issues.push({ path: `${at}.to`, message: 'A navigate step needs a string `to`' });
		}
		if (step.kind === 'set' && typeof step.path !== 'string') {
			issues.push({ path: `${at}.path`, message: 'A set step needs a string `path`' });
		}
	});
}

/**
 * Only literals are checked against the descriptor. An expression resolves in
 * the browser against state nobody has here, so its type is unknowable until
 * it runs, and rejecting one would rule out the format's main idea.
 */
function checkValue(
	descriptor: UiProperty,
	value: unknown,
	path: string,
	issues: UiDefinitionIssue[],
): void {
	if (value === undefined || isExpression(value)) return;

	if (descriptor.type === 'options' && descriptor.options) {
		const allowed = descriptor.options.map((option) => option.value);
		if (!allowed.includes(value as string | number | boolean)) {
			issues.push({
				path,
				message: `"${show(value)}" is not one of: ${allowed.map(String).join(', ')}`,
			});
		}
		return;
	}

	const expected =
		descriptor.type === 'number' ? 'number' : descriptor.type === 'boolean' ? 'boolean' : 'string';

	if (typeof value !== expected) {
		issues.push({ path, message: `Expected a ${expected} or an expression` });
	}
}

function checkNode(
	node: unknown,
	path: string,
	seenIds: Set<string>,
	issues: UiDefinitionIssue[],
): void {
	if (!isRecord(node)) {
		issues.push({ path, message: 'A node is an object of { id, type, props, tree }' });
		return;
	}

	const id = typeof node.id === 'string' && node.id ? node.id : undefined;
	const duplicate = id !== undefined && seenIds.has(id);

	if (!id) {
		issues.push({ path: `${path}.id`, message: 'A node needs a non-empty string `id`' });
	} else if (duplicate) {
		issues.push({ path: `${path}.id`, message: `Duplicate id "${id}"` });
	} else {
		seenIds.add(id);
	}

	// An id reads better than a structural path, but only while it still names one
	// node — a duplicate would point at two places at once.
	const here = id && !duplicate ? id : path;
	const spec = typeof node.type === 'string' ? getComponentSpec(node.type) : undefined;

	if (!spec) {
		issues.push({
			path: `${here}.type`,
			message: `Unknown component type "${show(node.type)}"`,
		});
		return;
	}

	// Past the guard `node.type` is this, and a string, which the rest can say so.
	const type = spec.type;

	const props = node.props;
	if (props !== undefined && !isRecord(props)) {
		issues.push({ path: `${here}.props`, message: '`props` is an object' });
	} else {
		const byName = new Map(spec.props.map((descriptor) => [descriptor.name, descriptor]));

		for (const [name, value] of Object.entries(props ?? {})) {
			const descriptor = byName.get(name);
			const at = `${here}.props.${name}`;

			if (!descriptor) {
				issues.push({
					path: at,
					message: `"${type}" has no prop "${name}". Known: ${[...byName.keys()].join(', ')}`,
				});
				continue;
			}

			if (descriptor.type === ACTION_PROP_TYPE) {
				checkAction(value, at, issues);
			} else if (descriptor.type === STATE_PATH_PROP_TYPE || descriptor.type === ROUTE_PROP_TYPE) {
				if (value !== undefined && typeof value !== 'string') {
					issues.push({ path: at, message: 'Expected a string path' });
				}
			} else {
				checkValue(descriptor, value, at, issues);
			}
		}
	}

	const tree = node.tree;
	if (tree === undefined) return;

	if (!isRecord(tree)) {
		issues.push({ path: `${here}.tree`, message: '`tree` is an object keyed by region' });
		return;
	}

	const regions = regionNamesOf(spec);

	for (const [region, children] of Object.entries(tree)) {
		const at = `${here}.tree.${region}`;

		if (!regions.includes(region)) {
			issues.push({
				path: at,
				message: regions.length
					? `"${type}" has no region "${region}". Known: ${regions.join(', ')}`
					: `"${type}" takes no children`,
			});
			// Fall through and check the children anyway: they are misplaced, not
			// necessarily also wrong, and one pass should report both.
		}

		if (!Array.isArray(children)) {
			issues.push({ path: at, message: 'A region holds an array of nodes' });
			continue;
		}

		children.forEach((child, index) => checkNode(child, `${at}[${index}]`, seenIds, issues));
	}
}

/**
 * Everything wrong with a definition, rather than the first thing: a caller
 * fixing one by hand — or an agent fixing one from an error message — wants the
 * whole list, and the walk costs nothing.
 */
export function validateUiDefinition(definition: unknown): UiDefinitionIssue[] {
	const issues: UiDefinitionIssue[] = [];
	checkNode(definition, 'definition', new Set<string>(), issues);
	return issues;
}

export function isUiDefinition(definition: unknown): definition is UiNode {
	return validateUiDefinition(definition).length === 0;
}

/** One line per issue, for an error message. */
export function formatUiDefinitionIssues(issues: UiDefinitionIssue[]): string {
	return issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
}
