import ts from 'typescript';
import { readFile } from 'fs/promises';

/**
 * Extract static manifest properties from a defineCloudExtension() call in TypeScript source
 * @param {string} sourcePath - Path to the TypeScript source file
 * @returns {Promise<object|null>} - Manifest object or null if not found
 */
export async function extractManifestFromSource(sourcePath) {
	const sourceCode = await readFile(sourcePath, 'utf-8');
	const sourceFile = ts.createSourceFile(sourcePath, sourceCode, ts.ScriptTarget.Latest, true);

	let manifest = null;

	function visit(node) {
		// Look for: export default defineCloudExtension({ ... })
		if (ts.isExportAssignment(node) && !node.isExportEquals) {
			const expression = node.expression;
			if (ts.isCallExpression(expression)) {
				const callee = expression.expression;
				if (ts.isIdentifier(callee) && callee.text === 'defineCloudExtension') {
					const arg = expression.arguments[0];
					if (arg && ts.isObjectLiteralExpression(arg)) {
						manifest = extractManifestFromObject(arg);
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	}

	ts.forEachChild(sourceFile, visit);
	return manifest;
}

/**
 * Extract manifest properties from an object literal expression
 * Only extracts static values (strings, numbers, object literals)
 * Note: 'extends' is not extracted because it now contains Vue components at runtime
 */
function extractManifestFromObject(objectLiteral) {
	const manifest = {};
	const manifestKeys = ['name', 'version', 'displayName', 'description', 'locales'];

	for (const property of objectLiteral.properties) {
		if (!ts.isPropertyAssignment(property)) continue;

		const key = getPropertyName(property);
		if (!key || !manifestKeys.includes(key)) continue;

		const value = extractStaticValue(property.initializer);
		if (value !== undefined) {
			manifest[key] = value;
		}
	}

	return Object.keys(manifest).length > 0 ? manifest : null;
}

/**
 * Get the name of a property assignment
 */
function getPropertyName(property) {
	if (ts.isIdentifier(property.name)) {
		return property.name.text;
	}
	if (ts.isStringLiteral(property.name)) {
		return property.name.text;
	}
	return null;
}

/**
 * Extract a static value from an AST node
 * Returns undefined for non-static values (function calls, identifiers, etc.)
 */
function extractStaticValue(node) {
	// String literal
	if (ts.isStringLiteral(node)) {
		return node.text;
	}

	// Numeric literal
	if (ts.isNumericLiteral(node)) {
		return Number(node.text);
	}

	// Boolean literals
	if (node.kind === ts.SyntaxKind.TrueKeyword) {
		return true;
	}
	if (node.kind === ts.SyntaxKind.FalseKeyword) {
		return false;
	}

	// Null literal
	if (node.kind === ts.SyntaxKind.NullKeyword) {
		return null;
	}

	// Object literal
	if (ts.isObjectLiteralExpression(node)) {
		const obj = {};
		for (const property of node.properties) {
			if (!ts.isPropertyAssignment(property)) continue;
			const key = getPropertyName(property);
			if (!key) continue;
			const value = extractStaticValue(property.initializer);
			if (value !== undefined) {
				obj[key] = value;
			}
		}
		return obj;
	}

	// Array literal
	if (ts.isArrayLiteralExpression(node)) {
		const arr = [];
		for (const element of node.elements) {
			const value = extractStaticValue(element);
			if (value !== undefined) {
				arr.push(value);
			}
		}
		return arr;
	}

	// Non-static value (function, identifier, call expression, etc.)
	return undefined;
}
