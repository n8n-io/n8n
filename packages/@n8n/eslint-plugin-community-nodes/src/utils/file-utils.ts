import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { dirname, parse as parsePath } from 'node:path';
import { parse, simpleTraverse, TSESTree } from '@typescript-eslint/typescript-estree';
import {
	isCredentialTypeClass,
	isNodeTypeClass,
	findClassProperty,
	getStringLiteralValue,
	findArrayLiteralProperty,
	extractCredentialInfoFromArray,
} from './ast-utils.js';

/**
 * Checks if the given childPath is contained within the parentPath. Resolves
 * the paths before comparing them, so that relative paths are also supported.
 */
export function isContainedWithin(parentPath: string, childPath: string): boolean {
	parentPath = path.resolve(parentPath);
	childPath = path.resolve(childPath);

	if (parentPath === childPath) {
		return true;
	}

	return childPath.startsWith(parentPath + path.sep);
}

/**
 * Joins the given paths to the parentPath, ensuring that the resulting path
 * is still contained within the parentPath. If not, it throws an error to
 * prevent path traversal vulnerabilities.
 *
 * @throws {UnexpectedError} If the resulting path is not contained within the parentPath.
 */
export function safeJoinPath(parentPath: string, ...paths: string[]): string {
	const candidate = path.join(parentPath, ...paths);

	if (!isContainedWithin(parentPath, candidate)) {
		throw new Error(
			`Path traversal detected, refusing to join paths: ${parentPath} and ${JSON.stringify(paths)}`,
		);
	}

	return candidate;
}

export function findPackageJson(startPath: string): string | null {
	let currentDir = startPath;

	while (parsePath(currentDir).dir !== parsePath(currentDir).root) {
		const testPath = safeJoinPath(currentDir, 'package.json');
		if (existsSync(testPath)) {
			return testPath;
		}

		currentDir = dirname(currentDir);
	}

	return null;
}

function readPackageJsonN8n(packageJsonPath: string): any {
	try {
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
		return packageJson.n8n || {};
	} catch {
		return {};
	}
}

function resolveN8nFilePaths(packageJsonPath: string, filePaths: string[]): string[] {
	const packageDir = dirname(packageJsonPath);
	const resolvedFiles: string[] = [];

	for (const filePath of filePaths) {
		const sourcePath = filePath.replace(/^dist\//, '').replace(/\.js$/, '.ts');
		const fullSourcePath = safeJoinPath(packageDir, sourcePath);

		if (existsSync(fullSourcePath)) {
			resolvedFiles.push(fullSourcePath);
		}
	}

	return resolvedFiles;
}

export function readPackageJsonCredentials(packageJsonPath: string): Set<string> {
	const n8nConfig = readPackageJsonN8n(packageJsonPath);
	const credentialPaths = n8nConfig.credentials || [];
	const credentialFiles = resolveN8nFilePaths(packageJsonPath, credentialPaths);
	const credentialNames: string[] = [];

	for (const credentialFile of credentialFiles) {
		try {
			const credentialName = extractCredentialNameFromFile(credentialFile);
			if (credentialName) {
				credentialNames.push(credentialName);
			}
		} catch {
			// Silently continue if file can't be parsed
		}
	}

	return new Set(credentialNames);
}

export function extractCredentialNameFromFile(credentialFilePath: string): string | null {
	try {
		const sourceCode = readFileSync(credentialFilePath, 'utf8');
		const ast = parse(sourceCode, {
			jsx: false,
			range: true,
		});

		let credentialName: string | null = null;

		simpleTraverse(ast, {
			enter(node: TSESTree.Node) {
				if (node.type === 'ClassDeclaration' && isCredentialTypeClass(node)) {
					const nameProperty = findClassProperty(node, 'name');
					if (nameProperty) {
						const nameValue = getStringLiteralValue(nameProperty.value);
						if (nameValue) {
							credentialName = nameValue;
						}
					}
				}
			},
		});

		return credentialName;
	} catch {
		return null;
	}
}

export function validateIconPath(
	iconPath: string,
	baseDir: string,
): {
	isValid: boolean;
	isFile: boolean;
	isSvg: boolean;
	exists: boolean;
} {
	const isFile = iconPath.startsWith('file:');
	const relativePath = iconPath.replace(/^file:/, '');
	const isSvg = relativePath.endsWith('.svg');
	// Should not use safeJoinPath here because iconPath can be outside of the node class folder
	const fullPath = path.join(baseDir, relativePath);
	const exists = existsSync(fullPath);

	return {
		isValid: isFile && isSvg && exists,
		isFile,
		isSvg,
		exists,
	};
}

export function readPackageJsonNodes(packageJsonPath: string): string[] {
	const n8nConfig = readPackageJsonN8n(packageJsonPath);
	const nodePaths = n8nConfig.nodes || [];
	return resolveN8nFilePaths(packageJsonPath, nodePaths);
}

export function areAllCredentialUsagesTestedByNodes(
	credentialName: string,
	packageDir: string,
): boolean {
	const packageJsonPath = safeJoinPath(packageDir, 'package.json');
	if (!existsSync(packageJsonPath)) {
		return false;
	}

	const nodeFiles = readPackageJsonNodes(packageJsonPath);
	let hasAnyCredentialUsage = false;

	for (const nodeFile of nodeFiles) {
		const result = checkCredentialUsageInFile(nodeFile, credentialName);
		if (result.hasUsage) {
			hasAnyCredentialUsage = true;
			if (!result.allTestedBy) {
				return false; // Found usage without testedBy
			}
		}
	}

	return hasAnyCredentialUsage;
}

function checkCredentialUsageInFile(
	nodeFile: string,
	credentialName: string,
): { hasUsage: boolean; allTestedBy: boolean } {
	try {
		const sourceCode = readFileSync(nodeFile, 'utf8');
		const ast = parse(sourceCode, { jsx: false, range: true });

		let hasUsage = false;
		let allTestedBy = true;

		simpleTraverse(ast, {
			enter(node: TSESTree.Node) {
				if (node.type === 'ClassDeclaration' && isNodeTypeClass(node)) {
					const descriptionProperty = findClassProperty(node, 'description');
					if (
						!descriptionProperty?.value ||
						descriptionProperty.value.type !== 'ObjectExpression'
					) {
						return;
					}

					const credentialsArray = findArrayLiteralProperty(
						descriptionProperty.value,
						'credentials',
					);
					if (!credentialsArray) {
						return;
					}

					for (const element of credentialsArray.elements) {
						const credentialInfo = extractCredentialInfoFromArray(element);
						if (credentialInfo?.name === credentialName) {
							hasUsage = true;
							if (!credentialInfo.testedBy) {
								allTestedBy = false;
							}
						}
					}
				}
			},
		});

		return { hasUsage, allTestedBy };
	} catch {
		return { hasUsage: false, allTestedBy: true };
	}
}
