import { getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';
import type { IConnections, INode } from 'n8n-workflow';

import { globMatch } from './path-traversal';

/** One step of a property chain after `.json`. */
type ChainSegment = { kind: 'name'; value: string } | { kind: 'index' } | { kind: 'dynamic' };

type JsonReference = {
	/** `undefined` for `$json` and `$input`, the node name for `$('name')` and `$node['name']`. */
	nodeName?: string;
	chain: ChainSegment[];
};

type PathSegment = { key: string; array: boolean };

const MAX_PARAMETER_DEPTH = 20;
const MAX_GROUP_LENGTH = 1000;
const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const isIdentChar = (char: string | undefined) => char !== undefined && /[\w$]/.test(char);

/** The segments of a rule path. `tags[*]` is the key `tags` with an array step. */
export function parseRulePath(path: string): PathSegment[] {
	return path
		.split('.')
		.map((segment) =>
			segment.endsWith('[*]')
				? { key: segment.slice(0, -3), array: true }
				: { key: segment, array: false },
		);
}

/** Longest text of the path that holds no `*`. Used to pre-filter in the database. */
export function longestLiteral(path: string): string | undefined {
	let best: string | undefined;
	for (const piece of path.replace(/\[\*\]/g, '.').split(/[.*]/)) {
		if (piece.length > (best?.length ?? 0)) best = piece;
	}
	return best;
}

/** A trigger is a node whose type name ends with `trigger` or is the webhook node. */
export function isTriggerNodeType(type: string): boolean {
	const name = type.slice(type.lastIndexOf('.') + 1).toLowerCase();
	return name.endsWith('trigger') || name === 'webhook';
}

class Scanner {
	pos = 0;

	constructor(readonly text: string) {}

	peek(offset = 0) {
		return this.text[this.pos + offset];
	}

	startsWith(value: string) {
		return this.text.startsWith(value, this.pos);
	}

	skipSpace() {
		while (this.peek() !== undefined && /\s/.test(this.peek() ?? '')) this.pos++;
	}

	/** Reads a quoted string at the position. Returns undefined when there is none. */
	readString(): string | undefined {
		const quote = this.peek();
		if (quote !== "'" && quote !== '"' && quote !== '`') return undefined;
		let value = '';
		this.pos++;
		while (this.pos < this.text.length) {
			const char = this.text[this.pos++];
			if (char === '\\') value += this.text[this.pos++] ?? '';
			else if (char === quote) return value;
			else value += char;
		}
		return undefined;
	}

	/**
	 * Skips a balanced `(...)` or `[...]` group that starts at the position. A group longer
	 * than `MAX_GROUP_LENGTH` counts as not closed, so a broken text costs linear time.
	 */
	skipGroup(): boolean {
		const open = this.peek();
		const close = open === '(' ? ')' : open === '[' ? ']' : undefined;
		if (!close) return false;
		const limit = Math.min(this.text.length, this.pos + MAX_GROUP_LENGTH);
		let depth = 0;
		while (this.pos < limit) {
			const quoted = this.readString();
			if (quoted !== undefined) continue;
			const char = this.text[this.pos++];
			if (char === open) depth++;
			else if (char === close && --depth === 0) return true;
		}
		return false;
	}

	readIdent(): string {
		const start = this.pos;
		while (isIdentChar(this.peek())) this.pos++;
		return this.text.slice(start, this.pos);
	}
}

/** `.item`, `.first()`, `.last()`, `.all()[n]` or `.itemMatching(n)`, then `.json`. */
function skipItemAccessor(scanner: Scanner): boolean {
	if (!scanner.startsWith('.')) return false;
	scanner.pos++;
	const name = scanner.readIdent();
	if (name === 'item') return scanner.startsWith('.json');
	if (!['first', 'last', 'all', 'itemMatching'].includes(name)) return false;
	if (!scanner.skipGroup()) return false;
	if (name === 'all' && scanner.peek() === '[') scanner.skipGroup();
	return scanner.startsWith('.json');
}

/** Reads the property chain that follows `json`. The scanner stops at the end of the chain. */
function readChain(scanner: Scanner): ChainSegment[] {
	const chain: ChainSegment[] = [];
	for (;;) {
		// `?.` before a name acts as `.`. `?.[` acts as `[`.
		if (scanner.startsWith('?.[')) scanner.pos += 2;
		else if (scanner.startsWith('?.')) scanner.pos++;
		if (scanner.peek() === '.') {
			scanner.pos++;
			const name = scanner.readIdent();
			if (!name) break;
			if (scanner.peek() === '(') break; // A method call is not a property.
			chain.push({ kind: 'name', value: name });
		} else if (scanner.peek() === '[') {
			const groupStart = scanner.pos;
			scanner.pos++;
			scanner.skipSpace();
			const literal = scanner.readString();
			scanner.skipSpace();
			if (literal !== undefined && scanner.peek() === ']') {
				scanner.pos++;
				chain.push({ kind: 'name', value: literal });
				continue;
			}
			scanner.pos = groupStart;
			const inner = scanner.text.slice(groupStart + 1, groupStart + 40);
			if (!scanner.skipGroup()) break;
			chain.push(/^\s*\d+\s*\]/.test(inner) ? { kind: 'index' } : { kind: 'dynamic' });
		} else {
			break;
		}
	}
	return chain;
}

/** Finds the places where an expression reads from the `json` of an item. */
export function findJsonReferences(expression: string): JsonReference[] {
	const references: JsonReference[] = [];
	const scanner = new Scanner(expression);

	while (scanner.pos < expression.length) {
		const start = scanner.pos;
		const before = expression[start - 1];
		const advance = () => {
			if (scanner.pos === start) scanner.pos++;
		};

		if (scanner.startsWith('$json') && !isIdentChar(before) && !isIdentChar(scanner.peek(5))) {
			scanner.pos += 5;
			references.push({ chain: readChain(scanner) });
		} else if (scanner.startsWith('$input') && !isIdentChar(before)) {
			scanner.pos += 6;
			if (skipItemAccessor(scanner)) {
				scanner.pos += '.json'.length;
				references.push({ chain: readChain(scanner) });
			}
		} else if (scanner.startsWith('$(') && !isIdentChar(before)) {
			scanner.pos += 2;
			scanner.skipSpace();
			const nodeName = scanner.readString();
			scanner.skipSpace();
			if (nodeName !== undefined && scanner.peek() === ')') {
				scanner.pos++;
				if (skipItemAccessor(scanner)) {
					scanner.pos += '.json'.length;
					references.push({ nodeName, chain: readChain(scanner) });
				}
			}
		} else if (
			scanner.startsWith('$node') &&
			!isIdentChar(before) &&
			!isIdentChar(scanner.peek(5))
		) {
			scanner.pos += 5;
			let nodeName: string | undefined;
			if (scanner.peek() === '[') {
				scanner.pos++;
				scanner.skipSpace();
				nodeName = scanner.readString();
				scanner.skipSpace();
				if (scanner.peek() === ']') scanner.pos++;
				else nodeName = undefined;
			} else if (scanner.peek() === '.') {
				scanner.pos++;
				nodeName = scanner.readIdent();
			}
			if (nodeName && scanner.startsWith('.json')) {
				scanner.pos += '.json'.length;
				references.push({ nodeName, chain: readChain(scanner) });
			}
		}
		advance();
	}

	return references;
}

/**
 * True when the chain reads the value at the rule path or a value below it. A chain that
 * stops above the path (for example `$json.headers`) still works, so it does not match.
 */
export function chainReadsPath(chain: ChainSegment[], path: PathSegment[]): boolean {
	let position = 0;
	for (const segment of path) {
		const step = chain[position];
		if (!step) return false;
		const matches =
			step.kind === 'dynamic' || (step.kind === 'name' && globMatch(segment.key, step.value));
		if (!matches) return false;
		position++;
		if (segment.array && chain[position] && chain[position].kind !== 'name') position++;
	}
	return true;
}

/** The text values of a node that can hold an expression or code. */
function* expressionTexts(node: INode): Generator<string> {
	const walk = function* (value: unknown, depth: number): Generator<string> {
		if (depth > MAX_PARAMETER_DEPTH) return;
		if (typeof value === 'string') {
			if (value.startsWith('=') || node.type === CODE_NODE_TYPE) yield value;
		} else if (Array.isArray(value)) {
			for (const item of value) yield* walk(item, depth + 1);
		} else if (typeof value === 'object' && value !== null) {
			for (const item of Object.values(value)) yield* walk(item, depth + 1);
		}
	};
	yield* walk(node.parameters, 0);
}

/**
 * Names of the nodes that read the value at `path` from the output of a trigger that the rule
 * applies to. `$json` and `$input` count when a matching trigger is an ancestor of the node.
 */
export function findReadingNodes(
	nodes: INode[],
	connections: IConnections,
	ruleNodeType: string,
	rulePath: string,
): string[] {
	const path = parseRulePath(rulePath);
	const appliesTo = (node: INode) =>
		ruleNodeType === '*' ? isTriggerNodeType(node.type) : node.type === ruleNodeType;

	const matchingNames = new Set(nodes.filter(appliesTo).map((node) => node.name));
	if (matchingNames.size === 0) return [];

	const byDestination = mapConnectionsByDestination(connections);
	const reading: string[] = [];

	for (const node of nodes) {
		let hasImplicitTrigger: boolean | undefined;
		const isReading = () => {
			for (const text of expressionTexts(node)) {
				for (const reference of findJsonReferences(text)) {
					if (!chainReadsPath(reference.chain, path)) continue;
					if (reference.nodeName !== undefined) {
						if (matchingNames.has(reference.nodeName)) return true;
						continue;
					}
					hasImplicitTrigger ??= getParentNodes(byDestination, node.name, 'ALL').some((name) =>
						matchingNames.has(name),
					);
					if (hasImplicitTrigger) return true;
				}
			}
			return false;
		};
		if (isReading()) reading.push(node.name);
	}

	return reading;
}
