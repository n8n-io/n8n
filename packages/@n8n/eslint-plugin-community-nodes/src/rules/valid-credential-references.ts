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

export const ValidCredentialReferencesRule = createRule({
	name: 'valid-credential-references',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ensure credentials referenced in node descriptions exist as credential classes in the package',
		},
		messages: {
			credentialNotFound:
				'Credential "{{ credentialName }}" does not exist in this package. Check for typos or ensure the credential class is declared and listed in package.json.',
			didYouMean: "Did you mean '{{ suggestedName }}'?",
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

				const knownCredentials = loadPackageCredentials();
				if (knownCredentials.size === 0) {
					return;
				}

				credentialsArray.elements.forEach((element) => {
					const credentialInfo = extractCredentialNameFromArray(element);
					if (!credentialInfo || knownCredentials.has(credentialInfo.name)) {
						return;
					}

					const similar = findSimilarStrings(credentialInfo.name, knownCredentials);
					const suggestions: ReportSuggestionArray<'credentialNotFound' | 'didYouMean'> =
						similar.map((suggestedName) => ({
							messageId: 'didYouMean' as const,
							data: { suggestedName },
							fix(fixer) {
								return fixer.replaceText(credentialInfo.node, `"${suggestedName}"`);
							},
						}));

					context.report({
						node: credentialInfo.node,
						messageId: 'credentialNotFound',
						data: { credentialName: credentialInfo.name },
						suggest: suggestions,
					});
				});
			},
		};
	},
});
