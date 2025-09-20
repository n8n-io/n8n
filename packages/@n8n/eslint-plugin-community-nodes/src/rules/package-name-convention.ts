import { ESLintUtils, TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

export const PackageNameConventionRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce correct package naming convention for n8n community nodes',
		},
		messages: {
			invalidPackageName:
				'Package name "{{ packageName }}" must follow the convention "n8n-nodes-[PACKAGE-NAME]" or "@[AUTHOR]/n8n-nodes-[PACKAGE-NAME]"',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return;
				}

				const nameProperty = node.properties.find(
					(property) =>
						property.type === AST_NODE_TYPES.Property &&
						property.key.type === AST_NODE_TYPES.Literal &&
						property.key.value === 'name',
				);

				if (!nameProperty || nameProperty.type !== AST_NODE_TYPES.Property) {
					return;
				}

				if (nameProperty.value.type !== AST_NODE_TYPES.Literal) {
					return;
				}

				const packageName = nameProperty.value.value;
				const packageNameStr = typeof packageName === 'string' ? packageName : null;

				if (!packageNameStr || !isValidPackageName(packageNameStr)) {
					context.report({
						node: nameProperty,
						messageId: 'invalidPackageName',
						data: {
							packageName: packageNameStr ?? 'undefined',
						},
					});
				}
			},
		};
	},
});

function isValidPackageName(name: string): boolean {
	const unscoped = /^n8n-nodes-.+$/;
	const scoped = /^@.+\/n8n-nodes-.+$/;
	return unscoped.test(name) || scoped.test(name);
}
