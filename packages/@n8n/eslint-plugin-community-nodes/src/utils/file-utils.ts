import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, parse as parsePath } from 'node:path';
import { parse } from '@typescript-eslint/typescript-estree';
import { isCredentialTypeClass, findClassProperty, getStringLiteralValue } from './ast-utils.js';

export function findPackageJson(startPath: string): string | null {
	let currentDir = startPath;

	while (parsePath(currentDir).dir !== parsePath(currentDir).root) {
		const testPath = join(currentDir, 'package.json');
		if (existsSync(testPath)) {
			return testPath;
		}

		currentDir = dirname(currentDir);
	}

	return null;
}

export function readPackageJsonCredentials(packageJsonPath: string): Set<string> {
	try {
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
		const credentialPaths = packageJson.n8n?.credentials || [];
		const packageDir = dirname(packageJsonPath);
		const credentialNames: string[] = [];

		for (const credentialPath of credentialPaths) {
			const sourcePath = credentialPath.replace(/^dist\//, '').replace(/\.js$/, '.ts');

			const fullSourcePath = join(packageDir, sourcePath);

			if (existsSync(fullSourcePath)) {
				try {
					const credentialName = extractCredentialNameFromFile(fullSourcePath);
					if (credentialName) {
						credentialNames.push(credentialName);
					}
				} catch {
					// Silently continue if file can't be parsed
				}
			}
		}

		return new Set(credentialNames);
	} catch {
		return new Set();
	}
}

export function extractCredentialNameFromFile(credentialFilePath: string): string | null {
	try {
		const sourceCode = readFileSync(credentialFilePath, 'utf8');
		const ast = parse(sourceCode, {
			jsx: false,
			range: true,
		});

		for (const statement of ast.body) {
			if (
				statement.type === 'ExportNamedDeclaration' &&
				statement.declaration?.type === 'ClassDeclaration'
			) {
				const classDeclaration = statement.declaration;

				if (isCredentialTypeClass(classDeclaration)) {
					const nameProperty = findClassProperty(classDeclaration, 'name');
					if (nameProperty) {
						const nameValue = getStringLiteralValue(nameProperty.value);
						if (nameValue) {
							return nameValue;
						}
					}
				}
			}
		}

		return null;
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
	const fullPath = join(baseDir, relativePath);
	const exists = existsSync(fullPath);

	return {
		isValid: isFile && isSvg && exists,
		isFile,
		isSvg,
		exists,
	};
}
