import { ESLintUtils } from '@typescript-eslint/utils';
import {
	isCredentialTypeClass,
	findClassProperty,
	hasArrayLiteralValue,
	isFileType,
	getStringLiteralValue,
	findPackageJson,
	areAllCredentialUsagesTestedByNodes,
} from '../utils/index.js';
import { dirname } from 'node:path';

export const CredentialTestRequiredRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure credentials have a credential test',
		},
		messages: {
			missingCredentialTest:
				'Credential class "{{ className }}" must have a test property or be tested by a node via testedBy',
		},
		schema: [],
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
					context.report({
						node,
						messageId: 'missingCredentialTest',
						data: {
							className: node.id?.name || 'Unknown',
						},
					});
					return;
				}

				const allUsagesTestedByNodes = areAllCredentialUsagesTestedByNodes(credentialName, pkgDir);
				if (!allUsagesTestedByNodes) {
					context.report({
						node,
						messageId: 'missingCredentialTest',
						data: {
							className: node.id?.name || 'Unknown',
						},
					});
				}
			},
		};
	},
});
