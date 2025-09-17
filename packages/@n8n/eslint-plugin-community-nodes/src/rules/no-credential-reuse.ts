import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse } from '@typescript-eslint/typescript-estree';

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
		// Only run on .node.ts files
		if (!context.filename.endsWith('.node.ts')) {
			return {};
		}

		let packageCredentials: Set<string> | null = null;

		// Load package.json and extract credential names
		const loadPackageCredentials = (): Set<string> => {
			if (packageCredentials !== null) {
				return packageCredentials;
			}

			try {
				// Find package.json by walking up the directory tree
				let currentDir = dirname(context.filename);
				let packageJsonPath = '';

				for (let i = 0; i < 10; i++) {
					// Max 10 levels up
					const testPath = join(currentDir, 'package.json');
					try {
						readFileSync(testPath, 'utf8');
						packageJsonPath = testPath;
						break;
					} catch {
						currentDir = dirname(currentDir);
					}
				}

				if (!packageJsonPath) {
					packageCredentials = new Set();
					return packageCredentials;
				}

				const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
				const credentialPaths = packageJson.n8n?.credentials || [];
				const packageDir = dirname(packageJsonPath);

				// Extract credential names by reading the actual credential source files
				const credentialNames: string[] = [];

				for (const credentialPath of credentialPaths) {
					// Convert dist path to source path: dist/credentials/MyApi.credentials.js -> credentials/MyApi.credentials.ts
					const sourcePath = credentialPath
						.replace(/^dist\//, '') // Remove 'dist/' prefix to get top-level path
						.replace(/\.js$/, '.ts'); // Change .js to .ts

					const fullSourcePath = join(packageDir, sourcePath);

					if (existsSync(fullSourcePath)) {
						try {
							const credentialName = extractCredentialName(fullSourcePath);
							if (credentialName) {
								credentialNames.push(credentialName);
							}
						} catch (error) {
							// Silently continue if file can't be parsed
						}
					}
				}

				packageCredentials = new Set(credentialNames);

				return packageCredentials;
			} catch (error) {
				// If we can't read package.json, assume no credentials are allowed
				packageCredentials = new Set();
				return packageCredentials;
			}
		};

		return {
			ClassDeclaration(node) {
				// Check if this class implements INodeType
				const implementsNodeType = node.implements?.some(
					(impl) =>
						impl.type === 'TSClassImplements' &&
						impl.expression.type === 'Identifier' &&
						impl.expression.name === 'INodeType',
				);

				if (!implementsNodeType) {
					return;
				}

				// Find the description property
				const descriptionProperty = node.body.body.find(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'description',
				);

				if (!descriptionProperty || descriptionProperty.type !== 'PropertyDefinition') {
					return;
				}

				// Find credentials array in description object
				const credentialsArray = findCredentialsInDescription(descriptionProperty.value);
				if (!credentialsArray) {
					return;
				}

				// Load allowed credentials from package.json
				const allowedCredentials = loadPackageCredentials();

				// Check each credential reference
				credentialsArray.elements.forEach((element) => {
					if (!element) return;

					let credentialName: string | null = null;
					let nodeToReport: TSESTree.Node | null = null;

					if (element.type === 'Literal' && typeof element.value === 'string') {
						// String form: credentials: ['myApi', 'anotherApi']
						credentialName = element.value;
						nodeToReport = element;
					} else if (element.type === 'ObjectExpression') {
						// Object form: credentials: [{ name: 'myApi', required: true }]
						const nameProperty = element.properties.find(
							(prop) =>
								prop.type === 'Property' &&
								prop.key.type === 'Identifier' &&
								prop.key.name === 'name' &&
								prop.value.type === 'Literal' &&
								typeof prop.value.value === 'string',
						);

						if (
							nameProperty &&
							nameProperty.type === 'Property' &&
							nameProperty.value.type === 'Literal'
						) {
							credentialName = nameProperty.value.value as string;
							nodeToReport = nameProperty.value;
						}
					}

					if (credentialName && nodeToReport && !allowedCredentials.has(credentialName)) {
						context.report({
							node: nodeToReport,
							messageId: 'credentialNotInPackage',
							data: {
								credentialName,
							},
						});
					}
				});
			},
		};
	},
});

function findCredentialsInDescription(
	descriptionValue: TSESTree.Expression | null,
): TSESTree.ArrayExpression | null {
	if (!descriptionValue || descriptionValue.type !== 'ObjectExpression') {
		return null;
	}

	const credentialsProperty = descriptionValue.properties.find(
		(prop) =>
			prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'credentials',
	);

	if (
		credentialsProperty?.type === 'Property' &&
		credentialsProperty.value.type === 'ArrayExpression'
	) {
		return credentialsProperty.value;
	}

	return null;
}

function extractCredentialName(credentialFilePath: string): string | null {
	try {
		const sourceCode = readFileSync(credentialFilePath, 'utf8');
		const ast = parse(sourceCode, {
			jsx: false,
			range: true,
		});

		// Find class that implements ICredentialType
		for (const statement of ast.body) {
			if (
				statement.type === 'ExportNamedDeclaration' &&
				statement.declaration?.type === 'ClassDeclaration'
			) {
				const classDeclaration = statement.declaration;

				// Check if class implements ICredentialType
				const implementsCredentialType = classDeclaration.implements?.some(
					(impl) =>
						impl.type === 'TSClassImplements' &&
						impl.expression.type === 'Identifier' &&
						impl.expression.name === 'ICredentialType',
				);

				if (implementsCredentialType) {
					// Find the name property
					const nameProperty = classDeclaration.body.body.find(
						(member) =>
							member.type === 'PropertyDefinition' &&
							member.key?.type === 'Identifier' &&
							(member.key as any).name === 'name',
					);

					if (
						nameProperty?.type === 'PropertyDefinition' &&
						nameProperty.value?.type === 'Literal' &&
						typeof nameProperty.value.value === 'string'
					) {
						return nameProperty.value.value;
					}
				}
			}
		}

		return null;
	} catch (error) {
		return null;
	}
}
