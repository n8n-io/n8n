import { isRecord } from '@n8n/utils/is-record';
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import { readFileSync } from 'node:fs';
import { basename, dirname, relative } from 'node:path';

import { createRule, findJsonProperty, findPackageJson } from '../utils/index.js';

function readPackageAuthor(packageJsonPath: string | null): string | null {
	if (!packageJsonPath) return null;
	try {
		const pkg: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
		if (!isRecord(pkg)) return null;
		const author = isRecord(pkg.author) ? pkg.author.name : pkg.author;
		return typeof author === 'string'
			? (author.split(/[<(]/)[0]?.trim().toLowerCase() ?? null)
			: null;
	} catch {
		return null;
	}
}

function hasThirdPartyHeader(header: string, author: string | null): boolean {
	const copyrights = [
		...header.matchAll(
			/(?:\bcopyright\s*(?:\(c\)|©)?|\(c\)|©)\s*(?:\d{4}(?:\s*[-–]\s*\d{2,4})?[\s,]*)*([^|\r\n*]+)/gi,
		),
	];
	if (copyrights.length > 0) {
		return copyrights.some(([, holder = '']) => {
			const name = holder
				.replace(/[,.\s]+all rights reserved\.?$/i, '')
				.trim()
				.toLowerCase();
			return !author || name !== author;
		});
	}
	return /@license\b|\blicensed under the (?:MIT|Apache|BSD|ISC)\b|\bthis file is part of\s+\S/i.test(
		header,
	);
}

export const NoVendoredDependenciesRule = createRule({
	name: 'no-vendored-dependencies',
	meta: {
		type: 'problem',
		docs: {
			description: 'Warn about third-party licence headers and bundled dependencies',
		},
		messages: {
			vendoredDependency:
				'`{{ file }}` carries a third-party licence header, which suggests a library has been copied into the package. Community nodes may not ship runtime dependencies, and vendoring one into source has the same effect. If you need a small piece of functionality, implement just that piece.',
			bundledDependenciesForbidden:
				'The "{{ field }}" field must be empty or absent. Community nodes may not ship bundled runtime dependencies. If you need a small piece of functionality, implement just that piece.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const filename = context.physicalFilename;
		if (basename(filename) === 'package.json') {
			return {
				ObjectExpression(node) {
					if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) return;
					for (const field of ['bundledDependencies', 'bundleDependencies']) {
						const property = findJsonProperty(node, field);
						if (
							property &&
							((property.value.type === AST_NODE_TYPES.ArrayExpression &&
								property.value.elements.length > 0) ||
								(property.value.type === AST_NODE_TYPES.Literal && property.value.value === true))
						) {
							context.report({
								node: property,
								messageId: 'bundledDependenciesForbidden',
								data: { field },
							});
						}
					}
				},
			};
		}
		if (!/\.(?:ts|js)$/.test(filename)) return {};

		const packageJsonPath = findPackageJson(filename);
		const file = packageJsonPath ? relative(dirname(packageJsonPath), filename) : filename;
		if (file.split(/[/\\]/).includes('dist')) return {};

		return {
			Program(node) {
				const source = context.sourceCode;
				const firstToken = source.getFirstToken(node);
				const leadingComments = source.getAllComments().filter((comment) => {
					return !firstToken || comment.range[0] < firstToken.range[0];
				});
				const author = readPackageAuthor(packageJsonPath);
				for (const comment of leadingComments) {
					if (
						comment.type === AST_TOKEN_TYPES.Block &&
						hasThirdPartyHeader(comment.value, author)
					) {
						context.report({
							loc: comment.loc,
							messageId: 'vendoredDependency',
							data: { file },
						});
						break;
					}
				}
			},
		};
	},
});
