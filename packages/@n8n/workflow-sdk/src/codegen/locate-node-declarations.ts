/**
 * Locate node declarations in workflow SDK source by parsing it, without
 * interpreting it. A text search cannot tell a node head apart from the same
 * text inside a sticky note, a prompt, or a parameter value; the AST can.
 */
import type { CallExpression, Node, ObjectExpression } from 'estree';

import { parseSDKCode } from '../ast-interpreter';
import { walkAst } from '../lint/ast-walk';
import { prepareSourceForLint } from '../lint/sdk/workflow-sdk-lint';

export interface NodeDeclarationLocation {
	/** The node's `name`, when the declaration carries one. */
	name?: string;
	/** The node's `id`, when the declaration carries one. */
	id?: string;
	/** 1-based line of the builder call that declares the node. */
	line: number;
}

/**
 * Every node declaration the source contains, in source order. Returns an empty
 * list when the source does not parse: a half-edited file has no reliable
 * locations to report.
 */
export function locateNodeDeclarations(source: string): NodeDeclarationLocation[] {
	let program: Node;
	try {
		program = parseSDKCode(prepareSourceForLint(source).code);
	} catch {
		return [];
	}

	const found: NodeDeclarationLocation[] = [];
	walkAst(program, (node) => {
		if (node.type !== 'CallExpression') return;
		const head = declaredNodeHead(node);
		if (!head) return;
		found.push({ ...readIdentity(head), line: node.loc?.start.line ?? 0 });
	});
	return found;
}

/**
 * The object that names the node a builder call declares. Node builders take
 * `{ type, version, config: { id, name, ... } }`; `sticky(content, nodes, options)`
 * names the note in its trailing options, also in the older `sticky(content, options)`
 * form the builder still accepts. A `config` key nested deeper, such as a parameter
 * that happens to be called `config`, is not a node head.
 */
function declaredNodeHead(call: CallExpression): ObjectExpression | undefined {
	const args = call.arguments;
	if (call.callee.type === 'Identifier' && call.callee.name === 'sticky') {
		const options = args.length >= 2 ? args[args.length - 1] : undefined;
		return options?.type === 'ObjectExpression' ? options : undefined;
	}

	const first = args[0];
	if (first?.type !== 'ObjectExpression') return undefined;
	const config = directProperty(first, 'config');
	return config?.type === 'ObjectExpression' ? config : undefined;
}

function readIdentity(head: ObjectExpression): Pick<NodeDeclarationLocation, 'name' | 'id'> {
	const name = stringValue(directProperty(head, 'name'));
	const id = stringValue(directProperty(head, 'id'));
	return { ...(name !== undefined ? { name } : {}), ...(id !== undefined ? { id } : {}) };
}

function directProperty(object: ObjectExpression, key: string): Node | undefined {
	for (const property of object.properties) {
		if (property.type !== 'Property' || property.computed) continue;
		const propertyKey = property.key;
		const matches =
			(propertyKey.type === 'Identifier' && propertyKey.name === key) ||
			(propertyKey.type === 'Literal' && propertyKey.value === key);
		if (matches) return property.value;
	}
	return undefined;
}

/** A plain string literal, or a template literal with no substitutions. */
function stringValue(value: Node | undefined): string | undefined {
	if (!value) return undefined;
	if (value.type === 'Literal' && typeof value.value === 'string') return value.value;
	if (value.type === 'TemplateLiteral' && value.expressions.length === 0) {
		return value.quasis[0]?.value.cooked ?? undefined;
	}
	return undefined;
}
