// AWS SDK clients in n8n are always handed explicit credentials. This rule bans
// the SDK helpers that auto-discover credentials from the host, so credential
// resolution stays routed through getSystemCredentials() and the
// awsSystemCredentialsAccess setting.
//
// Scope (intentional): only the aggregate "find credentials anywhere" resolvers are
// banned (`fromNodeProviderChain`, `defaultProvider`). Single-source providers (`fromEnv`,
// `fromIni`, `fromInstanceMetadata`, `fromTokenFile`, ...) stay importable on purpose; the
// follow-up credential migration composes a curated chain from the safe ones, so banning
// them here would block it. The sensitive single-source providers (`fromIni`/`fromSSO`/
// `fromProcess`) are gated at runtime by getSystemCredentials()'s per-provider allow-list
// behind the awsSystemCredentialsAccess setting (off by default), not by this import ban.
// This rule guards the omission case (a client built with no credentials falls back to the
// aggregate chain); whether an explicit provider value is itself a host-discovery provider
// (e.g. `credentials: fromIni()`) is owned by that runtime gate and is not inspected by the
// companion presence-only client-credentials test.
//
// The only legitimate import from these modules is a specific allowed name
// (`fromTemporaryCredentials`, `createCredentialChain`, `fromEnv`, …) selected via a
// named import or a named destructure. Every wholesale form — namespace import,
// `export *`, a non-destructured / rest-destructured / identifier-bound dynamic
// `import()` or `require()` — reaches the module without naming what it pulls, so it
// is reported at module level. For the discovery-only module, even a named selection
// is reported at module level: its entire surface is credential discovery.
import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const BANNED_MODULES = ['@aws-sdk/credential-providers', '@aws-sdk/credential-provider-node'];

const BANNED_NAMES = ['fromNodeProviderChain', 'defaultProvider'];

// Modules whose entire relevant export surface is credential discovery. Reaching the
// module at all — by any form, including a named selection — surfaces a banned helper,
// so every form is reported at module level. `@aws-sdk/credential-providers` is excluded:
// it also exports the allowed `fromTemporaryCredentials`, so a per-name selection there is
// inspected by name (allowed names pass, banned names are flagged).
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
// A computed key (`{ [expr]: x }`) is only a statically-known name when `expr` is a string
// literal (`{ ['fromNodeProviderChain']: x }`); a computed identifier or other expression
// (`{ [k]: x }`, `{ [`...`]: x }`) resolves at runtime, so its name is not statically visible
// here and we return undefined — that drops the pattern to module-level (the wholesale,
// can't-see-the-name handling) rather than mistaking the variable/expression for the key name.
const getDestructuredKeyName = (property: TSESTree.Property): string | undefined => {
	if (property.computed) {
		return property.key.type === 'Literal' && typeof property.key.value === 'string'
			? property.key.value
			: undefined;
	}
	if (property.key.type === 'Identifier') return property.key.name;
	if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
		return property.key.value;
	}
	return undefined;
};

// True when every element of the pattern is a named `Property` with a statically known key and
// there is no `RestElement`. Only then are the selected names fully visible, so a per-name check
// suffices; otherwise (a rest grabs the remaining surface, or a key is computed/unknown) the
// pattern can pull a banned helper without naming it, and the caller falls back to module level.
const isFullyNamedPattern = (pattern: TSESTree.ObjectPattern): boolean =>
	pattern.properties.every(
		(property) => property.type === 'Property' && getDestructuredKeyName(property) !== undefined,
	);

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

		// Reports a wholesale dynamic-import/require of a banned module at module level, mirroring
		// the namespace-import handling. A discovery-only module is always module-level; for the
		// mixed module, a per-name destructure is inspected by name (allowed names pass) and every
		// other shape — rest-destructure, identifier binding, bare call — is module-level.
		const reportDynamicModuleAccess = (
			node: TSESTree.ImportExpression | TSESTree.CallExpression,
			module: string,
		): void => {
			if (!DISCOVERY_ONLY_MODULES.includes(module)) {
				const pattern = getDestructuredPattern(node);
				if (pattern && isFullyNamedPattern(pattern)) {
					reportBannedDestructuredNames(pattern);
					return;
				}
			}
			context.report({
				node,
				messageId: 'noAwsCredentialDiscoveryModule',
				data: { module },
			});
		};

		return {
			ImportDeclaration(node) {
				const source = node.source.value;
				if (!isBannedModule(source)) return;

				// Top-level type-only import (`import type { defaultProvider } from ...`) is harmless.
				if (node.importKind === 'type') return;

				for (const specifier of node.specifiers) {
					// Namespace import (`import * as x from …`) reaches the module without naming what it
					// pulls, so it is reported at module level for both modules.
					if (specifier.type === 'ImportNamespaceSpecifier') {
						context.report({
							node: specifier,
							messageId: 'noAwsCredentialDiscoveryModule',
							data: { module: source },
						});
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
			// Flagged for BOTH modules — it makes no name selection, re-surfacing every export
			// (banned helpers included) to other modules.
			ExportAllDeclaration(node) {
				if (node.exportKind === 'type') return;
				if (!isBannedModule(node.source.value)) return;
				context.report({
					node,
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: node.source.value },
				});
			},

			// Dynamic import: `await import('<banned-module>')`. For the mixed module a fully-named
			// destructure is checked by name (so `{ fromTemporaryCredentials }` and other allowed
			// names pass while banned names are flagged); every other shape — rest-destructure,
			// identifier binding, bare call — is reported at module level. The discovery-only module
			// is always module-level.
			ImportExpression(node) {
				const { source } = node;
				if (source.type !== 'Literal' || typeof source.value !== 'string') return;
				if (!isBannedModule(source.value)) return;
				reportDynamicModuleAccess(node, source.value);
			},

			// `require('<banned-module>')`. Same name-aware handling as the dynamic-import handler
			// above. `require.resolve(...)` only resolves a path string and discovers nothing, so the
			// `callee.name === 'require'` guard (which excludes the `require.resolve` MemberExpression
			// callee) intentionally skips it.
			CallExpression(node: TSESTree.CallExpression) {
				if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') return;
				const [arg] = node.arguments;
				if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') return;
				if (!isBannedModule(arg.value)) return;
				reportDynamicModuleAccess(node, arg.value);
			},
		};
	},
});
