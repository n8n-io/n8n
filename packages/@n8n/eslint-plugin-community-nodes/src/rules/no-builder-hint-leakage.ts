import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

import { createRule } from '../utils/index.js';

const WIRE_EXPRESSION_RE = /={{/;
const CONNECTION_NAME_GROUP =
	'agent|chain|document|embedding|languageModel|memory|outputParser|retriever|reranker|textSplitter|tool|vectorStore';
const CONNECTION_NAME_RE = new RegExp(`\\bai_(${CONNECTION_NAME_GROUP})\\b`, 'g');
// Strings that are *exactly* a connection name are structured data values,
// not prose, so they're allowed (e.g. `connectionType: 'ai_languageModel'`).
const EXACT_CONNECTION_NAME_RE = new RegExp(`^ai_(${CONNECTION_NAME_GROUP})$`);

type Options = [{ scope?: 'builderHint' | 'all' }];
type MessageIds = 'wireExpression' | 'connectionTypeLiteral';

function isPropertyKey(node: TSESTree.Node): boolean {
	const parent = node.parent;
	return parent?.type === AST_NODE_TYPES.Property && parent.key === node;
}

function isInsideBuilderHintValue(node: TSESTree.Node): boolean {
	let current: TSESTree.Node | undefined = node;
	let parent = current.parent;
	while (parent) {
		if (
			parent.type === AST_NODE_TYPES.Property &&
			parent.value === current &&
			((parent.key.type === AST_NODE_TYPES.Identifier && parent.key.name === 'builderHint') ||
				(parent.key.type === AST_NODE_TYPES.Literal && parent.key.value === 'builderHint'))
		) {
			return true;
		}
		current = parent;
		parent = current.parent;
	}
	return false;
}

export const NoBuilderHintLeakageRule = createRule<Options, MessageIds>({
	name: 'no-builder-hint-leakage',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow wire-format expression syntax (={{...}}) and NodeConnectionType string literals in builderHint texts and AI-builder prompts. Use expr() and SDK-canonical references instead.',
		},
		messages: {
			wireExpression:
				'Wire-format expression syntax leaks into {{ ctx }}. Use the expr() SDK helper instead.',
			connectionTypeLiteral:
				'NodeConnectionType literal "{{ value }}" leaks wire format into {{ ctx }}. Refer to the SDK helper instead (e.g. languageModel(), tool(), memory()).',
		},
		schema: [
			{
				type: 'object',
				description:
					'Configures where the rule scans for forbidden patterns. Default `builderHint` only checks string values inside builderHint property values; `all` checks every string in the file (used for AI-builder prompts).',
				properties: {
					scope: {
						type: 'string',
						enum: ['builderHint', 'all'],
						description:
							'`builderHint` (default): only flag strings inside builderHint property values. `all`: flag every string literal/template in the file.',
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{}],
	create(context, [options]) {
		const scope = options.scope ?? 'builderHint';
		const ctx = scope === 'all' ? 'AI-builder prompt' : 'builderHint';

		function reportFor(node: TSESTree.Node, str: string): void {
			if (WIRE_EXPRESSION_RE.test(str)) {
				context.report({ node, messageId: 'wireExpression', data: { ctx } });
			}
			if (EXACT_CONNECTION_NAME_RE.test(str)) return;
			CONNECTION_NAME_RE.lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = CONNECTION_NAME_RE.exec(str)) !== null) {
				context.report({
					node,
					messageId: 'connectionTypeLiteral',
					data: { value: match[0], ctx },
				});
			}
		}

		function shouldCheck(node: TSESTree.Node): boolean {
			if (isPropertyKey(node)) return false;
			if (scope === 'all') return true;
			return isInsideBuilderHintValue(node);
		}

		return {
			Literal(node) {
				if (typeof node.value !== 'string') return;
				if (!shouldCheck(node)) return;
				reportFor(node, node.value);
			},
			TemplateLiteral(node) {
				if (!shouldCheck(node)) return;
				for (const quasi of node.quasis) {
					reportFor(quasi, quasi.value.cooked ?? quasi.value.raw);
				}
			},
		};
	},
});
