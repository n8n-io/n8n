import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { ReportSuggestionArray } from '@typescript-eslint/utils/ts-eslint';

import { createRule, findJsonProperty } from '../utils/index.js';

export const PackageNameConventionRule = createRule({
	name: 'package-name-convention',
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce correct package naming convention for n8n community nodes',
		},
		messages: {
			renameTo: "Rename to '{{suggestedName}}'",
			invalidPackageName:
				'Package name "{{ packageName }}" must follow the convention "n8n-nodes-[PACKAGE-NAME]" or "@[AUTHOR]/n8n-nodes-[PACKAGE-NAME]"',
		},
		schema: [],
		hasSuggestions: true,
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

				const nameProperty = findJsonProperty(node, 'name');

				if (!nameProperty) {
					return;
				}

				if (nameProperty.value.type !== AST_NODE_TYPES.Literal) {
					return;
				}

				const packageName = nameProperty.value.value;
				const packageNameStr = typeof packageName === 'string' ? packageName : null;

				if (!packageNameStr || !isValidPackageName(packageNameStr)) {
					const suggestions: ReportSuggestionArray<'invalidPackageName' | 'renameTo'> = [];

					// Generate package name suggestions if we have a valid string
					if (packageNameStr) {
						const suggestedNames = generatePackageNameSuggestions(packageNameStr);
						for (const suggestedName of suggestedNames) {
							suggestions.push({
								messageId: 'renameTo',
								data: { suggestedName },
								fix(fixer) {
									return fixer.replaceText(nameProperty.value, `"${suggestedName}"`);
								},
							});
						}
					}

					context.report({
						node: nameProperty,
						messageId: 'invalidPackageName',
						data: {
							packageName: packageNameStr ?? 'undefined',
						},
						suggest: suggestions,
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

function generatePackageNameSuggestions(invalidName: string): string[] {
	const cleanName = (name: string) => {
		return name
			.replace(/^nodes?-?n8n-?/, '')
			.replace(/^n8n-/, '')
			.replace(/^nodes?-?/, '')
			.replace(/^node-/, '')
			.replace(/-nodes$/, '');
	};

	if (invalidName.startsWith('@')) {
		const [scope, packagePart] = invalidName.split('/');
		const clean = cleanName(packagePart ?? '');
		return clean ? [`${scope}/n8n-nodes-${clean}`] : [];
	}

	const clean = cleanName(invalidName);
	return clean ? [`n8n-nodes-${clean}`] : [];
}
