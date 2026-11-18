import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

type Options = [{ checkMessageOnly?: boolean; checkMissingBinding?: boolean }];
type MessageIds = 'missingCause' | 'messageOnly' | 'noBinding';

const isFunction = (node: TSESTree.Node) =>
	node.type === 'FunctionExpression' ||
	node.type === 'ArrowFunctionExpression' ||
	node.type === 'FunctionDeclaration';

/** Visit child nodes without entering nested functions or nested catch clauses. */
function walk(node: TSESTree.Node, visit: (n: TSESTree.Node) => void) {
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') continue;
		const children = Array.isArray(value) ? value : [value];
		for (const child of children) {
			if (!child || typeof child !== 'object' || typeof (child as TSESTree.Node).type !== 'string')
				continue;
			const c = child as TSESTree.Node;
			if (isFunction(c) || c.type === 'CatchClause') continue;
			walk(c, visit);
		}
	}
}

/** Identifiers inside `node` whose name is in `names`, ignoring property keys. */
function referencesTo(node: TSESTree.Node, names: Set<string>): TSESTree.Identifier[] {
	const found: TSESTree.Identifier[] = [];
	const visit = (n: TSESTree.Node) => {
		if (n.type !== 'Identifier' || !names.has(n.name)) return;
		const p = n.parent;
		if (p?.type === 'MemberExpression' && p.property === n && !p.computed) return;
		if (p?.type === 'Property' && p.key === n && !p.computed && !p.shorthand) return;
		found.push(n);
	};
	const stack: TSESTree.Node[] = [node];
	while (stack.length) {
		const n = stack.pop()!;
		visit(n);
		for (const [key, value] of Object.entries(n)) {
			if (key === 'parent') continue;
			for (const child of Array.isArray(value) ? value : [value]) {
				if (
					child &&
					typeof child === 'object' &&
					typeof (child as TSESTree.Node).type === 'string'
				) {
					stack.push(child as TSESTree.Node);
				}
			}
		}
	}
	return found;
}

/** `error.message` (and only that) carries text but drops stack, cause, status and response details. */
const isMessageOnly = (id: TSESTree.Identifier) =>
	id.parent?.type === 'MemberExpression' &&
	id.parent.object === id &&
	!id.parent.computed &&
	id.parent.property.type === 'Identifier' &&
	id.parent.property.name === 'message';

export const PreserveErrorCauseRule = ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require errors thrown inside a `catch` block to keep the caught error, as `cause` or as the error argument of an n8n error class.',
		},
		messages: {
			missingCause:
				'This throw replaces the caught `{{name}}` and drops it. Pass `{{name}}` on, for example `{ cause: {{name}} }` or as the error argument of `NodeOperationError` / `NodeApiError`.',
			messageOnly:
				'This throw keeps only `{{name}}.message`, so the stack, cause and upstream details are lost. Pass `{{name}}` itself on as well.',
			noBinding:
				'This throw replaces the caught error, but the `catch` has no binding. Bind the error (`catch (error)`) and pass it on as `cause`.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					checkMessageOnly: { type: 'boolean' },
					checkMissingBinding: { type: 'boolean' },
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ checkMessageOnly: false, checkMissingBinding: true }],
	create(context, [options]) {
		return {
			CatchClause(node) {
				const param = node.param;
				if (param && param.type !== 'Identifier') return;

				// The caught error, plus local variables derived from it, e.g. `const err = e as Error`.
				const tainted = new Set<string>(param ? [param.name] : []);
				const throws: TSESTree.NewExpression[] = [];
				walk(node.body, (n) => {
					if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init) {
						if (referencesTo(n.init, tainted).length) tainted.add(n.id.name);
					}
					if (n.type === 'ThrowStatement' && n.argument?.type === 'NewExpression') {
						throws.push(n.argument);
					}
				});

				for (const thrown of throws) {
					if (!param) {
						if (options.checkMissingBinding)
							context.report({ node: thrown, messageId: 'noBinding' });
						continue;
					}
					const refs = thrown.arguments.flatMap((a) => referencesTo(a, tainted));
					if (refs.length === 0) {
						context.report({ node: thrown, messageId: 'missingCause', data: { name: param.name } });
					} else if (options.checkMessageOnly && refs.every(isMessageOnly)) {
						context.report({ node: thrown, messageId: 'messageOnly', data: { name: param.name } });
					}
				}
			},
		};
	},
});
