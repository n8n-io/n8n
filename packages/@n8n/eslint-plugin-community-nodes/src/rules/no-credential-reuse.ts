import { TSESTree } from '@typescript-eslint/types';
import type { ReportSuggestionArray } from '@typescript-eslint/utils/ts-eslint';

import {
	isNodeTypeClass,
	findClassProperty,
	findArrayLiteralProperty,
	extractCredentialNameFromArray,
	findPackageJson,
	readPackageJsonCredentials,
	isFileType,
	findSimilarStrings,
	createRule,
} from '../utils/index.js';

export const NoCredentialReuseRule = createRule({
	name: 'no-credential-reuse',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Prevent credential re-use security issues by ensuring nodes only reference credentials from the same package',
		},
		messages: {
			didYouMean: "Did you mean '{{ suggestedName }}'?",
			useAvailable: "Use available credential '{{ suggestedName }}'",
			credentialNotInPackage:
				'SECURITY: Node references credential "{{ credentialName }}" which is not defined in this package. This creates a security risk as it attempts to reuse credentials from other packages. Nodes can only use credentials from the same package as listed in package.json n8n.credentials field.',
		},
		schema: [],
		hasSuggestions: true,
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		let packageCredentials: Set<string> | null = null;

		const loadPackageCredentials = (): Set<string> => {
			if (packageCredentials !== null) {
				return packageCredentials;
			}

			const packageJsonPath = findPackageJson(context.filename);
			if (!packageJsonPath) {
				packageCredentials = new Set();
				return packageCredentials;
			}

			packageCredentials = readPackageJsonCredentials(packageJsonPath);
			return packageCredentials;
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (
					!descriptionProperty?.value ||
					descriptionProperty.value.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
				) {
					return;
				}

				const credentialsArray = findArrayLiteralProperty(descriptionProperty.value, 'credentials');
				if (!credentialsArray) {
					return;
				}

				const allowedCredentials = loadPackageCredentials();

				credentialsArray.elements.forEach((element) => {
					const credentialInfo = extractCredentialNameFromArray(element);
					if (credentialInfo && !allowedCredentials.has(credentialInfo.name)) {
						const similarCredentials = findSimilarStrings(credentialInfo.name, allowedCredentials);
						const suggestions: ReportSuggestionArray<
							'didYouMean' | 'useAvailable' | 'credentialNotInPackage'
						> = [];

						for (const similarName of similarCredentials) {
							suggestions.push({
								messageId: 'didYouMean',
								data: { suggestedName: similarName },
								fix(fixer) {
									return fixer.replaceText(credentialInfo.node, `"${similarName}"`);
								},
							});
						}

						if (suggestions.length === 0 && allowedCredentials.size > 0) {
							const availableCredentials = Array.from(allowedCredentials).slice(0, 3);
							for (const availableName of availableCredentials) {
								suggestions.push({
									messageId: 'useAvailable',
									data: { suggestedName: availableName },
									fix(fixer) {
										return fixer.replaceText(credentialInfo.node, `"${availableName}"`);
									},
								});
							}
						}

						context.report({
							node: credentialInfo.node,
							messageId: 'credentialNotInPackage',
							data: {
								credentialName: credentialInfo.name,
							},
							suggest: suggestions,
						});
					}
				});
			},
		};
	},
});
