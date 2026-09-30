import { ESLintUtils } from '@typescript-eslint/utils';

type Options = [{ paths: Array<{ name: string; message: string }> }];
type MessageIds = 'restrictedImport';

export const NoStaticRuntimeImportRule = ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow static runtime imports from configured modules.',
		},
		messages: {
			restrictedImport: '{{ message }}',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				required: ['paths'],
				properties: {
					paths: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							required: ['name', 'message'],
							properties: {
								name: { type: 'string' },
								message: { type: 'string' },
							},
						},
					},
				},
			},
		],
	},
	defaultOptions: [{ paths: [] }],
	create(context, [options]) {
		const restrictedPaths = new Map(options.paths.map(({ name, message }) => [name, message]));

		return {
			ImportDeclaration(node) {
				const message = restrictedPaths.get(node.source.value);
				if (!message || node.importKind === 'type') return;

				const hasRuntimeSpecifier = node.specifiers.some(
					(specifier) => specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type',
				);
				if (node.specifiers.length > 0 && !hasRuntimeSpecifier) return;

				context.report({ node: node.source, messageId: 'restrictedImport', data: { message } });
			},
		};
	},
});
