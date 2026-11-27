import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES, parse, simpleTraverse } from '@typescript-eslint/typescript-estree';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
	createRule,
	findJsonProperty,
	findObjectProperty,
	findPackageJson,
	getStringLiteralValue,
	getTopLevelObjectInJson,
	isContainedWithin,
	readJsonObject,
	readPackageJsonN8n,
} from '../utils/index.js';

export const CodexNodeNameRule = createRule({
	name: 'codex-node-name',
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Require the "node" field in .node.json codex files to be "<package-name>.<node-name>"',
		},
		messages: {
			missingNode:
				'Add a "node" field set to "{{ expected }}", the package name and the node\'s "name" joined by a dot.',
			wrongNode:
				'"node" is "{{ actual }}" but should be "{{ expected }}", the package name and the node\'s "name" joined by a dot, so a node and its trigger get different values.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('.node.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				const root = getTopLevelObjectInJson(node);
				if (!root) {
					return;
				}

				const packageJsonPath = findPackageJson(context.filename);
				const packageName = packageJsonPath ? readPackageName(packageJsonPath) : null;
				if (!packageJsonPath || !packageName) {
					return;
				}

				// n8n only reads the codex of a node registered in "n8n.nodes"
				const nodeFile = findRegisteredNodeFile(packageJsonPath, context.filename);
				if (nodeFile === undefined) {
					return;
				}

				const nodeName = nodeFile ? findNodeName(nodeFile) : null;
				const expected = `${packageName}.${nodeName ?? '<node-name>'}`;
				const property = findJsonProperty(root, 'node');

				if (!property) {
					const field = `"node": ${JSON.stringify(expected)}`;
					const [firstProperty] = root.properties;
					context.report({
						node: root,
						messageId: 'missingNode',
						data: { expected },
						fix: nodeName
							? (fixer) =>
									firstProperty
										? fixer.insertTextBefore(
												firstProperty,
												`${field},${whitespaceBefore(context.sourceCode.text, firstProperty)}`,
											)
										: fixer.insertTextAfterRange([root.range[0], root.range[0] + 1], field)
							: null,
					});
					return;
				}

				const { value } = property;
				const actual = getStringLiteralValue(value);

				const isValid = nodeName
					? actual === expected
					: actual !== null &&
						actual.startsWith(`${packageName}.`) &&
						actual.length > packageName.length + 1;
				if (isValid) {
					return;
				}

				context.report({
					node: value,
					messageId: 'wrongNode',
					data: { actual: actual ?? context.sourceCode.getText(value), expected },
					fix: nodeName ? (fixer) => fixer.replaceText(value, JSON.stringify(expected)) : null,
				});
			},
		};
	},
});

function readPackageName(packageJsonPath: string): string | null {
	const name = readJsonObject(packageJsonPath)?.name;
	return typeof name === 'string' && name.length > 0 ? name : null;
}

/** The whitespace that separates a node from the token before it, so an inserted sibling lines up */
function whitespaceBefore(text: string, node: TSESTree.Node): string {
	return /\s*$/.exec(text.slice(0, node.range[0]))?.[0] ?? '';
}

function resolveInPackage(packageDir: string, relativePath: string): string | null {
	const resolved = path.resolve(packageDir, relativePath);
	return isContainedWithin(packageDir, resolved) ? resolved : null;
}

/**
 * Finds the node in "n8n.nodes" that a codex file belongs to. n8n reads the
 * codex at `${filePath}on` of the registered file (`dist/nodes/Foo/Foo.node.js`
 * → `Foo.node.json`), and a source checkout keeps it next to the TypeScript
 * source. The node file next to the codex wins, so a stale `dist/` does not
 * shadow the source. Returns the node file on disk, `null` when the node is
 * registered but its file is missing, or `undefined` when no registered node
 * uses this codex
 */
function findRegisteredNodeFile(
	packageJsonPath: string,
	codexPath: string,
): string | null | undefined {
	const packageDir = path.dirname(packageJsonPath);
	const codex = path.resolve(codexPath);

	for (const registeredPath of readPackageJsonN8n(packageJsonPath).nodes ?? []) {
		const sourcePath = registeredPath.replace(/^dist\//, '');
		const nodeFiles = [
			{ codexOwner: registeredPath, nodePath: registeredPath },
			{ codexOwner: sourcePath, nodePath: sourcePath.replace(/\.js$/, '.ts') },
		];
		const nextToCodex = nodeFiles.find(
			({ codexOwner }) => resolveInPackage(packageDir, `${codexOwner}on`) === codex,
		);
		if (!nextToCodex) {
			continue;
		}

		return (
			[nextToCodex, ...nodeFiles.filter((nodeFile) => nodeFile !== nextToCodex)]
				.map(({ nodePath }) => resolveInPackage(packageDir, nodePath))
				.find((nodeFile) => nodeFile !== null && existsSync(nodeFile)) ?? null
		);
	}
	return undefined;
}

/** Reads the `name` from a node file's description */
export function findNodeName(nodeFile: string): string | null {
	let program: TSESTree.Program;
	try {
		program = parse(readFileSync(nodeFile, 'utf8'), { jsx: false });
	} catch {
		return null;
	}

	let name: string | null = null;
	simpleTraverse(program, {
		enter(node) {
			if (name === null && node.type === AST_NODE_TYPES.ObjectExpression) {
				name = descriptionName(node);
			}
		},
	});
	return name;
}

/**
 * The `name` of a node description: an object with string `name` and
 * `displayName`, and a `version`, `defaultVersion` or `properties`
 */
function descriptionName(object: TSESTree.ObjectExpression): string | null {
	const isDescription =
		findObjectProperty(object, 'displayName') !== null &&
		['version', 'defaultVersion', 'properties'].some(
			(key) => findObjectProperty(object, key) !== null,
		);
	const name = isDescription
		? getStringLiteralValue(findObjectProperty(object, 'name')?.value ?? null)
		: null;
	return name === '' ? null : name;
}
