import { defineRule } from '@oxlint/plugins';

import { isGlobalReflectMethodCall } from '../shared/reflect-method.js';

/**
 * Ban Reflect.get, which bypasses ordinary property access and useful type evidence.
 *
 * n8n change: the three-argument form is allowed. Proxy `get` traps need it to
 * forward the receiver, and `target[prop]` would run getters with the wrong `this`.
 */
export const noReflectGetRule = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Reflect.get; use typed property access or parse dynamic input into a domain type.',
		},
		messages: {
			reflectGet:
				'Replace `Reflect.get` with typed property access. Parse dynamic input into a named domain type before reading it.',
		},
	},
	createOnce(context) {
		return {
			CallExpression(node) {
				if (node.callee.type === 'Super' || node.callee.type === 'V8IntrinsicExpression') return;
				if (node.arguments.length >= 3) return;
				if (isGlobalReflectMethodCall(context.sourceCode, node.callee, 'get')) {
					context.report({ node, messageId: 'reflectGet' });
				}
			},
		};
	},
});
