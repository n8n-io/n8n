import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoAwsCredentialDiscoveryImportsRule } from './no-aws-credential-discovery-imports.js';

const ruleTester = new RuleTester();

ruleTester.run('no-aws-credential-discovery-imports', NoAwsCredentialDiscoveryImportsRule, {
	valid: [
		// Allowed helper from the mixed module via a named import.
		{ code: "import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';" },
		// Allowed helper, aliased — still allowed (not a banned name).
		{ code: "import { fromTemporaryCredentials as ftc } from '@aws-sdk/credential-providers';" },
		// Unrelated AWS client.
		{ code: "import { STSClient } from '@aws-sdk/client-sts';" },
		// Same name, but from an unrelated package.
		{ code: "import { fromNodeProviderChain } from 'some-unrelated-pkg';" },
		{ code: "import { defaultProvider } from 'some-unrelated-pkg';" },
		// Dynamic import of the mixed module selecting the allowed name — fine (ENT-66 lazy-import form).
		{
			code: "async function load() { const { fromTemporaryCredentials } = await import('@aws-sdk/credential-providers'); }",
		},
		// require() of the mixed module selecting the allowed name — fine.
		{ code: "const { fromTemporaryCredentials } = require('@aws-sdk/credential-providers');" },
		// Computed string-literal key selecting the allowed name - statically known, not banned, so fine.
		{
			code: "const { ['fromTemporaryCredentials']: x } = await import('@aws-sdk/credential-providers');",
		},
		// Dynamic import destructuring only non-banned names — fine (ENT-66 lazy chain assembly).
		{
			code: "async function load() { const { createCredentialChain, fromEnv } = await import('@aws-sdk/credential-providers'); }",
		},
		// Top-level type-only import.
		{ code: "import type { defaultProvider } from '@aws-sdk/credential-provider-node';" },
		// Inline type-only specifier.
		{ code: "import { type defaultProvider } from '@aws-sdk/credential-provider-node';" },
		// require.resolve only resolves a path string.
		{ code: "const p = require.resolve('@aws-sdk/credential-provider-node');" },
		// Banned-name member access on an object that is not a banned-module binding — fine (no banned import).
		{
			code: 'const other = getThing();\nother.fromNodeProviderChain();',
		},
	],
	invalid: [
		{
			code: "import { fromNodeProviderChain } from '@aws-sdk/credential-providers';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		{
			code: "import { defaultProvider } from '@aws-sdk/credential-provider-node';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'defaultProvider' } }],
		},
		// Aliased import — flagged by the original name.
		{
			code: "import { defaultProvider as dp } from '@aws-sdk/credential-provider-node';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'defaultProvider' } }],
		},
		// Aliased banned name from the mixed module — flagged by the original name.
		{
			code: "import { fromNodeProviderChain as x } from '@aws-sdk/credential-providers';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Re-export laundering.
		{
			code: "export { defaultProvider } from '@aws-sdk/credential-provider-node';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'defaultProvider' } }],
		},
		// Namespace import of the mixed module — now module-level (the only allowed form is a named/destructured selection).
		{
			code: "import * as creds from '@aws-sdk/credential-providers';",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
		// Namespace import of the discovery-only module — module-level.
		{
			code: "import * as x from '@aws-sdk/credential-provider-node';",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// require() of the discovery-only module, bare call — module-level.
		{
			code: "require('@aws-sdk/credential-provider-node');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// require() of the discovery-only module bound to an identifier — module-level (entire surface is discovery).
		{
			code: "const creds = require('@aws-sdk/credential-provider-node');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// Dynamic import of the discovery-only module, bare — module-level.
		{
			code: "async function load() { return await import('@aws-sdk/credential-provider-node'); }",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// Non-destructured dynamic import of the mixed module bound to an identifier — module-level
		// (names are not statically visible; only a named/destructured selection is allowed).
		{
			code: "async function load() { const creds = await import('@aws-sdk/credential-providers'); }",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
		// Non-destructured require of the mixed module bound to an identifier — module-level.
		{
			code: "const creds = require('@aws-sdk/credential-providers');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
		// Rest-destructure of the discovery-only module — module-level (no per-name selection to inspect).
		{
			code: "const { ...creds } = require('@aws-sdk/credential-provider-node');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// Rest-destructure of the mixed module via dynamic import — module-level (wholesale grab, no per-name selection).
		{
			code: "async function load() { const { ...creds } = await import('@aws-sdk/credential-providers'); }",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
		// Dynamic import of the mixed module destructuring a banned name — caught by name (the bypass).
		{
			code: "async function load() { const { fromNodeProviderChain } = await import('@aws-sdk/credential-providers'); }",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Aliased destructure of a banned name from the mixed module — flagged by the original key.
		{
			code: "async function load() { const { fromNodeProviderChain: x } = await import('@aws-sdk/credential-providers'); }",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Computed string-literal key from the mixed module - statically known, still caught by name.
		{
			code: "const { ['fromNodeProviderChain']: x } = await import('@aws-sdk/credential-providers');",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Computed identifier key from the mixed module - the key name is not statically the property
		// name, so the pattern is not fully named and falls to module-level (the bypass this guards).
		{
			code: "const k = 'fromNodeProviderChain';\nconst { [k]: x } = await import('@aws-sdk/credential-providers');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
		// Computed template-literal key from the mixed module - not a string Literal node, so not
		// statically known; falls to module-level.
		{
			code: 'const { [`fromNodeProviderChain`]: x } = await import("@aws-sdk/credential-providers");',
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
		// Computed identifier key via require of the discovery-only module - falls to module-level.
		{
			code: "const k = 'defaultProvider';\nconst { [k]: x } = require('@aws-sdk/credential-provider-node');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// Dynamic import of the discovery-only module destructuring a banned name — module-level (entire surface is discovery).
		{
			code: "async function load() { const { fromNodeProviderChain } = await import('@aws-sdk/credential-provider-node'); }",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// require() of the mixed module destructuring a banned name — caught by name (the bypass).
		{
			code: "const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// require() of the discovery-only module destructuring a banned name — module-level (entire surface is discovery).
		{
			code: "const { defaultProvider } = require('@aws-sdk/credential-provider-node');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// Combined banned + allowed — exactly one error, pinned to the banned specifier.
		{
			code: "import { fromNodeProviderChain, fromTemporaryCredentials } from '@aws-sdk/credential-providers';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Namespace import is flagged at the import; a shadowing param of the same name must NOT add a
		// second error — member-access tracking is intentionally gone, so exactly one error fires.
		{
			code: "import * as creds from '@aws-sdk/credential-providers';\nfunction f(creds) { return creds.fromNodeProviderChain(); }",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
		// Wholesale re-export laundering — module-level message, flagged for both modules.
		{
			code: "export * from '@aws-sdk/credential-provider-node';",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		{
			code: "export * from '@aws-sdk/credential-providers';",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-providers' },
				},
			],
		},
	],
});
