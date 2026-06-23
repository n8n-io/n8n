import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoAwsCredentialDiscoveryImportsRule } from './no-aws-credential-discovery-imports.js';

const ruleTester = new RuleTester();

ruleTester.run('no-aws-credential-discovery-imports', NoAwsCredentialDiscoveryImportsRule, {
	valid: [
		// Allowed helper from the same module.
		{ code: "import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';" },
		// Unrelated AWS client.
		{ code: "import { STSClient } from '@aws-sdk/client-sts';" },
		// Same name, but from an unrelated package.
		{ code: "import { fromNodeProviderChain } from 'some-unrelated-pkg';" },
		{ code: "import { defaultProvider } from 'some-unrelated-pkg';" },
		// Namespace import of credential-providers is fine — it exports fromTemporaryCredentials.
		{ code: "import * as creds from '@aws-sdk/credential-providers';" },
		// Dynamic import of credential-providers selecting the allowed name — fine (ENT-66 lazy-import form).
		{
			code: "async function load() { const { fromTemporaryCredentials } = await import('@aws-sdk/credential-providers'); }",
		},
		// require() of credential-providers selecting the allowed name — fine.
		{ code: "const { fromTemporaryCredentials } = require('@aws-sdk/credential-providers');" },
		// Dynamic import / require destructuring only non-banned names — fine (ENT-66 lazy chain assembly).
		{
			code: "async function load() { const { createCredentialChain, fromEnv } = await import('@aws-sdk/credential-providers'); }",
		},
		// Namespace import of the mixed module, then accessing the allowed member — fine.
		{
			code: "import * as creds from '@aws-sdk/credential-providers';\nconst p = creds.fromTemporaryCredentials({ params: {}, masterCredentials });",
		},
		// Namespace-style dynamic import of the mixed module, then accessing the allowed member — fine.
		{
			code: "async function load() { const creds = await import('@aws-sdk/credential-providers'); const p = creds.fromTemporaryCredentials({ params: {}, masterCredentials }); }",
		},
		// Banned-name member access on an object that is NOT a banned-module namespace binding — fine.
		{
			code: 'const other = getThing();\nother.fromNodeProviderChain();',
		},
		// Top-level type-only import.
		{ code: "import type { defaultProvider } from '@aws-sdk/credential-provider-node';" },
		// Inline type-only specifier.
		{ code: "import { type defaultProvider } from '@aws-sdk/credential-provider-node';" },
		// require.resolve only resolves a path string.
		{ code: "const p = require.resolve('@aws-sdk/credential-provider-node');" },
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
		// Re-export laundering.
		{
			code: "export { defaultProvider } from '@aws-sdk/credential-provider-node';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'defaultProvider' } }],
		},
		// Namespace import of credential-provider-node — module-level message.
		{
			code: "import * as x from '@aws-sdk/credential-provider-node';",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// require() of the discovery-only module, non-destructured (bare call) — module-level message.
		{
			code: "require('@aws-sdk/credential-provider-node');",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
				},
			],
		},
		// Dynamic import, non-destructured (bare return) — module-level message.
		{
			code: "async function load() { return await import('@aws-sdk/credential-provider-node'); }",
			errors: [
				{
					messageId: 'noAwsCredentialDiscoveryModule',
					data: { module: '@aws-sdk/credential-provider-node' },
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
		// Dynamic import of the discovery-only module destructuring a banned name — caught by name.
		{
			code: "async function load() { const { fromNodeProviderChain } = await import('@aws-sdk/credential-provider-node'); }",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// require() of the mixed module destructuring a banned name — caught by name (the bypass).
		{
			code: "const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// require() of the discovery-only module destructuring a banned name — caught by name.
		{
			code: "const { defaultProvider } = require('@aws-sdk/credential-provider-node');",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'defaultProvider' } }],
		},
		// Combined banned + allowed — exactly one error, pinned to the banned specifier.
		{
			code: "import { fromNodeProviderChain, fromTemporaryCredentials } from '@aws-sdk/credential-providers';",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Namespace import of the mixed module, then banned member access — caught at the access site.
		{
			code: "import * as creds from '@aws-sdk/credential-providers';\nconst p = creds.fromNodeProviderChain();",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Namespace-style dynamic import bound to an identifier, then banned member access — caught.
		{
			code: "async function load() { const creds = await import('@aws-sdk/credential-providers'); const p = creds.fromNodeProviderChain(); }",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
		},
		// Non-destructured require bound to an identifier, then banned member access — caught.
		{
			code: "const creds = require('@aws-sdk/credential-providers');\nconst p = creds.fromNodeProviderChain();",
			errors: [{ messageId: 'noAwsCredentialDiscovery', data: { name: 'fromNodeProviderChain' } }],
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
