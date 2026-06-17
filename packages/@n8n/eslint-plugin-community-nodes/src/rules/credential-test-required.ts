import type { ReportSuggestionArray } from '@typescript-eslint/utils/ts-eslint';
import { dirname } from 'node:path';

import {
	isCredentialTypeClass,
	findClassProperty,
	hasArrayLiteralValue,
	isFileType,
	getStringLiteralValue,
	findPackageJson,
	areAllCredentialUsagesTestedByNodes,
	createRule,
} from '../utils/index.js';

export const CredentialTestRequiredRule = createRule({
	name: 'credential-test-required',
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure credentials have a credential test',
		},
		messages: {
			addTemplate: 'Add basic credential test template',
			missingCredentialTest:
				'Credential class "{{ className }}" must have a test property or be tested by a node via testedBy',
		},
		schema: [],
		hasSuggestions: true,
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.credentials.ts')) {
			return {};
		}

		let packageDir: string | null = null;

		const getPackageDir = (): string | null => {
			if (packageDir !== null) {
				return packageDir;
			}

			const packageJsonPath = findPackageJson(context.filename);
			if (!packageJsonPath) {
				packageDir = '';
				return packageDir;
			}

			packageDir = dirname(packageJsonPath);
			return packageDir;
		};

		return {
			ClassDeclaration(node) {
				if (!isCredentialTypeClass(node)) {
					return;
				}

				const extendsProperty = findClassProperty(node, 'extends');
				if (extendsProperty && hasArrayLiteralValue(extendsProperty, 'oAuth2Api')) {
					return;
				}

				const testProperty = findClassProperty(node, 'test');
				if (testProperty) {
					return;
				}

				const nameProperty = findClassProperty(node, 'name');
				if (!nameProperty) {
					return;
				}

				const credentialName = getStringLiteralValue(nameProperty.value);
				if (!credentialName) {
					return;
				}

				const pkgDir = getPackageDir();
				if (!pkgDir) {
					const suggestions: ReportSuggestionArray<'addTemplate' | 'missingCredentialTest'> = [];

					const testProperty = createCredentialTestTemplate();
					suggestions.push({
						messageId: 'addTemplate',
						fix(fixer) {
							const classBody = node.body.body;
							const lastProperty = classBody[classBody.length - 1];
							if (lastProperty) {
								return fixer.insertTextAfter(lastProperty, `\n\n${testProperty}`);
							}
							return null;
						},
					});

					context.report({
						node,
						messageId: 'missingCredentialTest',
						data: {
							className: node.id?.name ?? 'Unknown',
						},
						suggest: suggestions,
					});
					return;
				}

				const allUsagesTestedByNodes = areAllCredentialUsagesTestedByNodes(credentialName, pkgDir);
				if (!allUsagesTestedByNodes) {
					const suggestions: ReportSuggestionArray<'addTemplate' | 'missingCredentialTest'> = [];

					const testProperty = createCredentialTestTemplate();
					suggestions.push({
						messageId: 'addTemplate',
						fix(fixer) {
							const classBody = node.body.body;
							const lastProperty = classBody[classBody.length - 1];
							if (lastProperty) {
								return fixer.insertTextAfter(lastProperty, `\n\n${testProperty}`);
							}
							return null;
						},
					});

					context.report({
						node,
						messageId: 'missingCredentialTest',
						data: {
							className: node.id?.name ?? 'Unknown',
						},
						suggest: suggestions,
					});
				}
			},
		};
	},
});

function createCredentialTestTemplate(): string {
	return `\ttest: ICredentialTestRequest = {
\t\trequest: {
\t\t\tmethod: 'GET',
\t\t\turl: '={{$credentials.server}}/test', // Replace with actual endpoint
\t\t},
\t};`;
}
