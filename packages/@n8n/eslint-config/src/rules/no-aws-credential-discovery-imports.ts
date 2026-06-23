// AWS SDK clients in n8n are always handed explicit credentials. This rule bans
// the SDK helpers that auto-discover credentials from the host, so credential
// resolution stays routed through getSystemCredentials() and the
// awsSystemCredentialsAccess setting.
import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const BANNED_MODULES = ['@aws-sdk/credential-providers', '@aws-sdk/credential-provider-node'];

const BANNED_NAMES = ['fromNodeProviderChain', 'defaultProvider'];

// Modules whose entire relevant export surface is credential discovery, so simply
// reaching the module (namespace import, dynamic `import()`, or `require()`) is enough
// to surface a banned helper. `@aws-sdk/credential-providers` is intentionally excluded:
// it also exports the allowed `fromTemporaryCredentials`, so module-level access there is
// not by itself a violation — the consumer selects a specific name (see the per-name checks).
const DISCOVERY_ONLY_MODULES = ['@aws-sdk/credential-provider-node'];

const isBannedModule = (source: string): boolean => BANNED_MODULES.includes(source);

const isBannedName = (name: string): boolean => BANNED_NAMES.includes(name);

// Resolves the destructuring pattern bound to a dynamic-import/require call result, so the
// selected names can be checked by name (mirroring static imports). Returns the ObjectPattern
// for `const { a, b } = require(M)` / `const { a } = await import(M)`, or undefined when the
// result is bound to a plain identifier, used bare, or consumed via `.then(...)` — forms where
// the selected names are not statically visible at the binding site.
const getDestructuredPattern = (
	node: TSESTree.ImportExpression | TSESTree.CallExpression,
): TSESTree.ObjectPattern | undefined => {
	// `await import(M)` sits inside an AwaitExpression; `require(M)` binds directly.
	const binding =
		node.type === 'ImportExpression' && node.parent?.type === 'AwaitExpression'
			? node.parent.parent
			: node.parent;
	if (
		binding?.type === 'VariableDeclarator' &&
		binding.init === (node.type === 'ImportExpression' ? node.parent : node) &&
		binding.id.type === 'ObjectPattern'
	) {
		return binding.id;
	}
	return undefined;
};

// Returns the original (source-module) key for a destructured property, matching the static-
// import handling: `{ fromNodeProviderChain: x }` is still a `fromNodeProviderChain` selection.
const getDestructuredKeyName = (property: TSESTree.Property): string | undefined => {
	if (property.key.type === 'Identifier') return property.key.name;
	if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
		return property.key.value;
	}
	return undefined;
};

// Returns the identifier name a dynamic-import/require result is bound to when it is NOT
// destructured — i.e. `const creds = await import(M)` / `const creds = require(M)`. This is the
// namespace-like binding whose member access (`creds.fromNodeProviderChain`) must be tracked.
// Mirrors getDestructuredPattern but for the plain-identifier (non-ObjectPattern) binding.
const getIdentifierBindingName = (
	node: TSESTree.ImportExpression | TSESTree.CallExpression,
): string | undefined => {
	const binding =
		node.type === 'ImportExpression' && node.parent?.type === 'AwaitExpression'
			? node.parent.parent
			: node.parent;
	if (
		binding?.type === 'VariableDeclarator' &&
		binding.init === (node.type === 'ImportExpression' ? node.parent : node) &&
		binding.id.type === 'Identifier'
	) {
		return binding.id.name;
	}
	return undefined;
};

export const NoAwsCredentialDiscoveryImportsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'AWS SDK clients in n8n are always handed explicit credentials. This rule bans the SDK helpers that auto-discover credentials from the host (`fromNodeProviderChain`, `defaultProvider`), so credential resolution stays routed through getSystemCredentials() and the awsSystemCredentialsAccess setting.',
		},
		messages: {
			noAwsCredentialDiscovery:
				"Do not import '{{name}}'. Pass explicit `credentials` to AWS SDK clients; host credential discovery must go through getSystemCredentials().",
			noAwsCredentialDiscoveryModule:
				"Do not import from '{{module}}' to reach credential-discovery helpers. Pass explicit `credentials` to AWS SDK clients; host credential discovery must go through getSystemCredentials().",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		// Namespace-like bindings of a banned module (local name → module), collected so member
		// access on them can be checked at Program:exit regardless of binding/usage order. Populated
		// from `import * as creds from '@aws-sdk/credential-providers'` (the mixed module, which is
		// allowed at import time for `fromTemporaryCredentials`) and from non-destructured dynamic
		// `import()` / `require()` bound to a plain identifier. The discovery-only module is already
		// reported module-level at the import site, so it is not tracked here.
		const namespaceBindings = new Map<string, string>();
		// Every `<object>.<property>` access whose object and property are plain identifiers,
		// collected for the Program:exit cross-check against namespaceBindings.
		const memberAccessCandidates: Array<{
			objectName: string;
			propertyName: string;
			node: TSESTree.MemberExpression;
		}> = [];

		// Reports each destructured property whose source-module name is banned, pinning the
		// report to the property so the location matches the offending name (handles the aliased
		// `{ fromNodeProviderChain: x }` form, whose key is still `fromNodeProviderChain`).
		const reportBannedDestructuredNames = (pattern: TSESTree.ObjectPattern): void => {
			for (const property of pattern.properties) {
				if (property.type !== 'Property') continue;
				const name = getDestructuredKeyName(property);
				if (name !== undefined && isBannedName(name)) {
					context.report({
						node: property,
						messageId: 'noAwsCredentialDiscovery',
						data: { name },
					});
				}
			}
		};

		return {
			ImportDeclaration(node) {
				const source = node.source.value;
				if (!isBannedModule(source)) return;

				// Top-level type-only import (`import type { defaultProvider } from ...`) is harmless.
				if (node.importKind === 'type') return;

				for (const specifier of node.specifiers) {
					if (specifier.type === 'ImportNamespaceSpecifier') {
						if (DISCOVERY_ONLY_MODULES.includes(source)) {
							context.report({
								node: specifier,
								messageId: 'noAwsCredentialDiscoveryModule',
								data: { module: source },
							});
						} else {
							// Mixed module: the namespace import itself is allowed (needed for
							// `fromTemporaryCredentials`), but record the binding so banned member
							// access on it is caught at Program:exit.
							namespaceBindings.set(specifier.local.name, source);
						}
						continue;
					}

					if (specifier.type !== 'ImportSpecifier') continue;
					// Per-specifier type-only import (`import { type defaultProvider } from ...`).
					if (specifier.importKind === 'type') continue;

					const importedName =
						specifier.imported.type === 'Identifier'
							? specifier.imported.name
							: specifier.imported.value;
					if (isBannedName(importedName)) {
						context.report({
							node: specifier,
							messageId: 'noAwsCredentialDiscovery',
							data: { name: importedName },
						});
					}
				}
			},

			// Re-export laundering: `export { defaultProvider } from '@aws-sdk/credential-provider-node'`.
			ExportNamedDeclaration(node) {
				if (!node.source) return;
				if (!isBannedModule(node.source.value)) return;
				if (node.exportKind === 'type') return;

				for (const specifier of node.specifiers) {
					if (specifier.exportKind === 'type') continue;

					// `local` is the name in the source module — the one that must not be re-surfaced.
					const localName =
						specifier.local.type === 'Identifier' ? specifier.local.name : specifier.local.value;
					if (isBannedName(localName)) {
						context.report({
							node: specifier,
							messageId: 'noAwsCredentialDiscovery',
							data: { name: localName },
						});
					}
				}
			},

			// Wholesale re-export laundering: `export * from '@aws-sdk/credential-provider-node'`.
			// Flagged for BOTH modules (`isBannedModule`), unlike the other module-level forms.
			// A namespace import / dynamic `import()` / `require()` of `credential-providers` lets the
			// consumer locally select a specific name (typically the allowed `fromTemporaryCredentials`),
			// so those are allowed for that module. `export *` makes no such selection — it
			// unconditionally re-surfaces every export, banned helpers included, to other modules.
			ExportAllDeclaration(node) {
				if (node.exportKind === 'type') return;
				if (!isBannedModule(node.source.value)) return;
				context.report({
					node,
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: node.source.value },
				});
			},

			// Dynamic import: `await import('<banned-module>')`. Name-aware, mirroring static imports:
			// when the result is destructured (`const { a, b } = await import(M)`), each selected name
			// is matched against the ban list — so `const { fromNodeProviderChain } = await
			// import('@aws-sdk/credential-providers')` is caught while `{ fromTemporaryCredentials }`
			// (ENT-66's lazy-import form) and other non-banned names are allowed. When the result is
			// NOT name-destructured (plain identifier, used bare, `.then(...)`), the selected names
			// aren't visible: fall back to the module-level report for the discovery-only module, and
			// leave the mixed `credential-providers` module alone (accepted residual — same class as a
			// namespace import, which also can't see selected names).
			ImportExpression(node) {
				const { source } = node;
				if (source.type !== 'Literal' || typeof source.value !== 'string') return;
				if (!isBannedModule(source.value)) return;

				const pattern = getDestructuredPattern(node);
				if (pattern) {
					reportBannedDestructuredNames(pattern);
					return;
				}

				// Non-destructured but bound to a plain identifier (`const creds = await import(M)`):
				// record the namespace-like binding so banned member access is caught at Program:exit.
				const bindingName = getIdentifierBindingName(node);
				if (bindingName !== undefined) {
					namespaceBindings.set(bindingName, source.value);
				}

				if (DISCOVERY_ONLY_MODULES.includes(source.value)) {
					context.report({
						node,
						messageId: 'noAwsCredentialDiscoveryModule',
						data: { module: source.value },
					});
				}
			},

			// `require('<banned-module>')`. Name-aware, mirroring the dynamic-import handler above:
			// `const { defaultProvider } = require('@aws-sdk/credential-provider-node')` is caught by
			// the selected name, as is a banned name destructured from `credential-providers`, while
			// `const { fromTemporaryCredentials } = require('@aws-sdk/credential-providers')` is allowed.
			// A non-destructured require (plain identifier / bare call) falls back to the module-level
			// report for the discovery-only module only; the mixed module is left alone (residual).
			// `require.resolve(...)` only resolves a path string and discovers nothing, so the
			// `callee.name === 'require'` guard (which excludes the `require.resolve` MemberExpression
			// callee) intentionally skips it.
			CallExpression(node: TSESTree.CallExpression) {
				if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') return;
				const [arg] = node.arguments;
				if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') return;
				if (!isBannedModule(arg.value)) return;

				const pattern = getDestructuredPattern(node);
				if (pattern) {
					reportBannedDestructuredNames(pattern);
					return;
				}

				// Non-destructured but bound to a plain identifier (`const creds = require(M)`):
				// record the namespace-like binding so banned member access is caught at Program:exit.
				const bindingName = getIdentifierBindingName(node);
				if (bindingName !== undefined) {
					namespaceBindings.set(bindingName, arg.value);
				}

				if (DISCOVERY_ONLY_MODULES.includes(arg.value)) {
					context.report({
						node,
						messageId: 'noAwsCredentialDiscoveryModule',
						data: { module: arg.value },
					});
				}
			},

			// Collect candidate `<object>.<property>` accesses with plain-identifier object and
			// non-computed identifier property. Resolved against namespaceBindings at Program:exit so
			// `creds.fromNodeProviderChain` is caught whether the binding was seen before or after.
			MemberExpression(node) {
				if (node.object.type !== 'Identifier') return;
				if (node.computed || node.property.type !== 'Identifier') return;
				memberAccessCandidates.push({
					objectName: node.object.name,
					propertyName: node.property.name,
					node,
				});
			},

			// Flag banned member access (`creds.fromNodeProviderChain()`) on a recorded banned-module
			// namespace binding — the access path that an allowed namespace import (mixed module) or a
			// non-destructured dynamic import/require would otherwise leave open. Only fires when the
			// object is a tracked banned-module binding, so unrelated `foo.fromNodeProviderChain` and
			// the allowed `creds.fromTemporaryCredentials` (not a banned name) are not flagged.
			'Program:exit'() {
				for (const candidate of memberAccessCandidates) {
					if (namespaceBindings.has(candidate.objectName) && isBannedName(candidate.propertyName)) {
						context.report({
							node: candidate.node,
							messageId: 'noAwsCredentialDiscovery',
							data: { name: candidate.propertyName },
						});
					}
				}
			},
		};
	},
});
