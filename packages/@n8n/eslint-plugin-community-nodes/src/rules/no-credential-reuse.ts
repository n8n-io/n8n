import { ESLintUtils } from '@typescript-eslint/utils';
import {
	isNodeTypeClass,
	findClassProperty,
	findArrayLiteralProperty,
	extractCredentialNameFromArray,
	findPackageJson,
	readPackageJsonCredentials,
	isFileType,
} from '../utils/index.js';

export const NoCredentialReuseRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Prevent credential re-use security issues by ensuring nodes only reference credentials from the same package',
		},
		messages: {
			credentialNotInPackage:
				'SECURITY: Node references credential "{{ credentialName }}" which is not defined in this package. This creates a security risk as it attempts to reuse credentials from other packages. Nodes can only use credentials from the same package as listed in package.json n8n.credentials field.',
		},
		schema: [],
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
				if (!descriptionProperty?.value || descriptionProperty.value.type !== 'ObjectExpression') {
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
						context.report({
							node: credentialInfo.node,
							messageId: 'credentialNotInPackage',
							data: {
								credentialName: credentialInfo.name,
							},
						});
					}
				});
			},
		};
	},
});
