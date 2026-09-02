import { ESLintUtils } from '@typescript-eslint/utils';

export const NoOnLeaderTakeoverRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ensure periodic leader-only work runs as a `@SystemTask()` class instead of hand-rolled `@OnLeaderTakeover` timers.',
		},
		messages: {
			useSystemTask:
				'Periodic leader-only work belongs on a `@SystemTask()` class (`*.task.ts`); the system task runner owns the leader takeover/stepdown and shutdown lifecycle. Reserve `@OnLeaderTakeover` for services that hold live resources on the leader (webhooks, pollers, sockets) or need a one-shot catch-up on takeover, and add such a file to the allowlist in `eslint.config.mjs`.',
			noNamespaceImport:
				'Use named imports from `@n8n/decorators`. A namespace import hides `OnLeaderTakeover` usage from this rule.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				if (node.source.value !== '@n8n/decorators') return;

				for (const specifier of node.specifiers) {
					if (specifier.type === 'ImportNamespaceSpecifier') {
						context.report({ node: specifier, messageId: 'noNamespaceImport' });
					} else if (
						specifier.type === 'ImportSpecifier' &&
						specifier.imported.type === 'Identifier' &&
						specifier.imported.name === 'OnLeaderTakeover'
					) {
						context.report({ node: specifier, messageId: 'useSystemTask' });
					}
				}
			},
		};
	},
});
