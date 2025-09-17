import { ESLintUtils, TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

// Removed static evaluation - check environment dynamically

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
		// Only run on package.json files
		if (!context.filename.includes('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				// Only check the top-level object expression (root of package.json)
				// Skip nested objects by checking if this node has a parent ObjectExpression
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return; // This is a nested object, skip it
				}

				const nameProperty = getNameProperty(node);
				if (!nameProperty) return;

				const packageName = nameProperty.value;
				if (packageName === null || !isValidPackageName(packageName || '')) {
					context.report({
						node: nameProperty.node,
						messageId: 'invalidPackageName',
						data: {
							packageName: packageName ?? 'undefined',
						},
					});
				}
			},
		};
	},
});

function getNameProperty(
	node: TSESTree.ObjectExpression,
): { node: TSESTree.Property; value: string | null } | null {
	const nameProperty = node.properties.find(
		(property): property is TSESTree.Property =>
			property.type === AST_NODE_TYPES.Property &&
			property.key.type === AST_NODE_TYPES.Literal &&
			property.key.value === 'name',
	);

	if (!nameProperty || nameProperty.value.type !== AST_NODE_TYPES.Literal) {
		return null;
	}

	return {
		node: nameProperty,
		value: typeof nameProperty.value.value === 'string' ? nameProperty.value.value : null,
	};
}

function isValidPackageName(name: string): boolean {
	// Pattern 1: n8n-nodes-[PACKAGE-NAME]
	const unscoped = /^n8n-nodes-.+$/;

	// Pattern 2: @[AUTHOR]/n8n-nodes-[PACKAGE-NAME]
	const scoped = /^@.+\/n8n-nodes-.+$/;

	return unscoped.test(name) || scoped.test(name);
}
