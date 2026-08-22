import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse, simpleTraverse, AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { dirname, parse as parsePath } from 'node:path';

import {
	isCredentialTypeClass,
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	findArrayLiteralProperty,
	extractCredentialInfoFromArray,
	findSimilarStrings,
	programImportsModule,
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
	let currentDir = path.dirname(startPath);

	while (parsePath(currentDir).dir !== parsePath(currentDir).root) {
		const testPath = safeJoinPath(currentDir, 'package.json');
		if (fileExistsWithCaseSync(testPath)) {
			return testPath;
		}

		currentDir = dirname(currentDir);
	}

	return null;
}

interface PackageJsonN8n {
	credentials?: string[];
	nodes?: string[];
	[key: string]: unknown;
}

function isValidPackageJson(obj: unknown): obj is { n8n?: PackageJsonN8n } {
	return typeof obj === 'object' && obj !== null;
}

function readPackageJsonRaw(packageJsonPath: string): Record<string, unknown> | null {
	try {
		const content = readFileSync(packageJsonPath, 'utf8');
		const parsed: unknown = JSON.parse(content);
		return isValidPackageJson(parsed) ? (parsed as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

/**
 * Whether the given `.ts` file has a top-level `import` from one of
 * `moduleNames`. Used to detect whether a specific node file (not its
 * package as a whole — a single package can mix AI-SDK nodes with ordinary
 * ones) is built on n8n's AI Node SDK.
 */
export function fileImportsModule(filePath: string, moduleNames: readonly string[]): boolean {
	try {
		const sourceCode = readFileSync(filePath, 'utf8');
		const ast = parse(sourceCode, { jsx: false, range: true });
		return programImportsModule(ast, moduleNames);
	} catch {
		return false;
	}
}

/**
 * Whether the given `.node.ts` file's `INodeType` class declares an inline
 * `description.codex` property. n8n's node loader (DirectoryLoader#addCodex)
 * uses `description.codex` as-is whenever it's set, and only falls back to
 * reading the sibling `.node.json` codex file when it's absent — there's no
 * field-by-field merge. So a `.node.json` file's categories/subcategories
 * have no effect on the running node whenever this returns true.
 */
export function fileHasInlineDescriptionCodex(nodeFilePath: string): boolean {
	try {
		const sourceCode = readFileSync(nodeFilePath, 'utf8');
		const ast = parse(sourceCode, { jsx: false, range: true });

		let hasInlineCodex = false;
		simpleTraverse(ast, {
			enter(node: TSESTree.Node) {
				if (node.type === AST_NODE_TYPES.ClassDeclaration && isNodeTypeClass(node)) {
					const descriptionProperty = findClassProperty(node, 'description');
					if (
						descriptionProperty?.value?.type === AST_NODE_TYPES.ObjectExpression &&
						findObjectProperty(descriptionProperty.value, 'codex')
					) {
						hasInlineCodex = true;
					}
				}
			},
		});

		return hasInlineCodex;
	} catch {
		return false;
	}
}

function readPackageJsonN8n(packageJsonPath: string): PackageJsonN8n {
	const parsed = readPackageJsonRaw(packageJsonPath);
	if (parsed) {
		const n8n = parsed.n8n;
		return typeof n8n === 'object' && n8n !== null ? (n8n as PackageJsonN8n) : {};
	}
	return {};
}

/**
 * Returns the set of package names listed under `devDependencies` in the given
 * package.json. Dev dependencies are never installed at runtime on n8n Cloud
 * (only the built `dist/` is shipped), so importing them is not a runtime
 * dependency concern and is permitted by `no-restricted-imports`.
 */
export function readPackageJsonDevDependencies(packageJsonPath: string | null): Set<string> {
	if (!packageJsonPath) return new Set();
	const parsed = readPackageJsonRaw(packageJsonPath);
	if (!parsed) return new Set();
	const devDeps = parsed.devDependencies;
	if (typeof devDeps !== 'object' || devDeps === null) return new Set();
	return new Set(Object.keys(devDeps as Record<string, unknown>));
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
	const credentialPaths = n8nConfig.credentials ?? [];
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
				if (node.type === AST_NODE_TYPES.ClassDeclaration && isCredentialTypeClass(node)) {
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
	exists: boolean;
} {
	const isFile = iconPath.startsWith('file:');
	const relativePath = iconPath.replace(/^file:/, '');
	// Should not use safeJoinPath here because iconPath can be outside of the node class folder
	const fullPath = path.join(baseDir, relativePath);
	const exists = fileExistsWithCaseSync(fullPath);

	return {
		isValid: isFile && exists,
		isFile,
		exists,
	};
}

export function readPackageJsonNodes(packageJsonPath: string): string[] {
	const n8nConfig = readPackageJsonN8n(packageJsonPath);
	const nodePaths = n8nConfig.nodes ?? [];
	return resolveN8nFilePaths(packageJsonPath, nodePaths);
}

function findFilesRecursively(dir: string, matches: (fileName: string) => boolean): string[] {
	const results: string[] = [];

	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return results;
	}

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findFilesRecursively(fullPath, matches));
		} else if (entry.isFile() && matches(entry.name)) {
			results.push(fullPath);
		}
	}

	return results;
}

/**
 * Finds all `*.node.ts` source files in the package's `nodes/` directory,
 * returning their absolute paths. Returns an empty array if there is no
 * `nodes/` directory.
 */
export function findNodeSourceFilesOnDisk(packageJsonPath: string): string[] {
	const packageDir = dirname(packageJsonPath);
	const nodesDir = safeJoinPath(packageDir, 'nodes');

	if (!existsSync(nodesDir)) {
		return [];
	}

	return findFilesRecursively(nodesDir, (fileName) => fileName.endsWith('.node.ts'));
}

/**
 * Recursively finds files matching `matches` within the given subdirectories of
 * the package (relative to its `package.json`). Missing subdirectories are
 * skipped. Returns absolute paths.
 */
export function findFilesInPackageDirs(
	packageJsonPath: string,
	dirs: string[],
	matches: (fileName: string) => boolean,
): string[] {
	const packageDir = dirname(packageJsonPath);
	const results: string[] = [];

	for (const dir of dirs) {
		const fullPath = safeJoinPath(packageDir, dir);
		if (existsSync(fullPath)) {
			results.push(...findFilesRecursively(fullPath, matches));
		}
	}

	return results;
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
				if (node.type === AST_NODE_TYPES.ClassDeclaration && isNodeTypeClass(node)) {
					const descriptionProperty = findClassProperty(node, 'description');
					if (
						!descriptionProperty?.value ||
						descriptionProperty.value.type !== AST_NODE_TYPES.ObjectExpression
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

function fileExistsWithCaseSync(filePath: string): boolean {
	try {
		const dir = path.dirname(filePath);
		const file = path.basename(filePath);
		const files = new Set(readdirSync(dir));

		return files.has(file);
	} catch {
		return false;
	}
}

const ICON_EXTENSIONS = ['.svg', '.png'];

export function findSimilarIconFiles(targetPath: string, baseDir: string): string[] {
	try {
		const targetFileName = path.basename(targetPath, path.extname(targetPath));
		const targetDir = path.dirname(targetPath);
		// Should not use safeJoinPath here because iconPath can be outside of the node class folder
		const searchDir = path.join(baseDir, targetDir);

		if (!existsSync(searchDir)) {
			return [];
		}

		const files = readdirSync(searchDir).filter((file) =>
			ICON_EXTENSIONS.includes(path.extname(file).toLowerCase()),
		);

		// Map icon base names to their actual filenames so suggestions keep their extension.
		const baseNameToFiles = new Map<string, string[]>();
		for (const file of files) {
			const baseName = path.basename(file, path.extname(file));
			const existing = baseNameToFiles.get(baseName) ?? [];
			existing.push(file);
			baseNameToFiles.set(baseName, existing);
		}

		const candidateNames = new Set(baseNameToFiles.keys());
		const similarNames = findSimilarStrings(targetFileName, candidateNames);

		return similarNames.flatMap((name) =>
			(baseNameToFiles.get(name) ?? []).map((file) => path.join(targetDir, file)),
		);
	} catch {
		return [];
	}
}
