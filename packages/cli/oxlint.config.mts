import { defineConfig } from 'oxlint';
import { backendConfig } from '@n8n/oxlint-config/backend';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Single source of truth for project-owned entity transfer decisions
const ownershipTransferManifest = require('./src/services/ownership-transfer/ownership-transfer.manifest.json');
const acknowledgedProjectOwnedEntities = [
	...ownershipTransferManifest.transferred,
	...ownershipTransferManifest.notTransferred,
].map(({ name, path }) => ({ name, path }));

const INSTANCE_AI_LAZY_IMPORT_MESSAGE =
	'Use an existing lazy loader, or add one near first use. Static runtime imports of this dependency undo the Instance AI idle-memory guardrail.';

const POLICY_INTERNAL_RESTRICTION = {
	name: '@n8n/decorators/policy-internal',
	message:
		'Only PolicyEnforcementService may mint a policy clearance. Call enforce*/evaluate* instead.',
};

const instanceAiLazyRuntimeImports = [
	'@joplin/turndown-plugin-gfm',
	'@mozilla/readability',
	'linkedom',
	'pdf-parse',
	'turndown',
].map((name) => ({
	name,
	allowTypeImports: true,
	message: INSTANCE_AI_LAZY_IMPORT_MESSAGE,
}));

// Only JwtService may reach the raw signing API: it derives the `aud` claim from
// the token's purpose, which is what keeps a token for one purpose from being
// presented for another. The error classes and types stay importable.
const jsonwebtokenSigningRestriction = {
	name: 'jsonwebtoken',
	// An allowlist, not a denylist: the module's whole runtime surface is off
	// limits except the error classes, so a member added upstream is restricted
	// from the start. `allowTypeImports` keeps `Secret`, `Algorithm` and friends
	// importable. A namespace import is restricted too — the linter cannot see
	// which members it reaches for.
	allowImportNames: ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'],
	allowTypeImports: true,
	message:
		'Sign and verify through JwtService, so the token is bound to a purpose in token-purposes.ts.',
};

// `jsonwebtoken` declares no `exports`, so `jsonwebtoken/sign` and its siblings
// resolve straight to the same functions and would slip past a name-only rule.
const jsonwebtokenSubpathRestriction = {
	group: ['jsonwebtoken/*'],
	message:
		'Sign and verify through JwtService, so the token is bound to a purpose in token-purposes.ts.',
};

const engineV2ModuleOnlyImport = {
	name: '@n8n/engine',
	allowTypeImports: true,
	message:
		'Only src/modules/engine-v2/** may import @n8n/engine at runtime. Use a type import, or reach the engine through EngineDataPlaneProxyService.',
};

export default defineConfig({
	extends: [backendConfig],
	ignorePatterns: ['scripts/**/*.mjs', 'vitest.*.ts', 'coverage/**'],
	rules: {
		'n8n-local-rules/no-dynamic-import-template': 'error',
		// Ratchets: the allowlists below only shrink, so an inline disable is the one way to add a violation.
		'n8n-local-rules/no-guardrail-disable': [
			'error',
			{
				guarded: [
					{
						rule: 'no-repository-in-public-api-handler',
						message: 'Call a service instead of reaching the repository.',
					},
					{
						rule: 'require-public-api-controller',
						message: 'Migrate to `@PublicApiController`.',
					},
					{
						rule: 'no-unsealed-workflow-entity-write',
						message: 'Route the write through a token-gated `WorkflowRepository` method.',
					},
					{
						rule: 'no-unsealed-credentials-entity-write',
						message: 'Route the write through a token-gated `CredentialsRepository` method.',
					},
				],
			},
		],
		'n8n-local-rules/no-type-unsafe-event-emitter': 'error',
		// Periodic leader-only work must be a @SystemTask() class; hand-rolled
		// @OnLeaderTakeover timers are reserved for the allowlisted services below.
		'n8n-local-rules/no-on-leader-takeover': 'error',
		// The clearance minter lives on the `policy-internal` subpath, off the public barrel.
		// Only PolicyEnforcementService may reach it; callers use enforce*/evaluate*.
		'no-restricted-imports': ['error', { paths: [POLICY_INTERNAL_RESTRICTION] }],
		'n8n-local-rules/project-owned-entity-transfer': [
			'error',
			{ acknowledged: acknowledgedProjectOwnedEntities },
		],

		// TODO: Remove this
		'typescript/ban-ts-comment': 'off',
		'import/no-cycle': 'warn',
		'no-ex-assign': 'warn',
		'no-case-declarations': 'warn',
		'no-fallthrough': 'warn',
		'no-unsafe-optional-chaining': 'warn',
		'no-async-promise-executor': 'warn',
		'typescript/prefer-promise-reject-errors': 'warn',
		'typescript/no-explicit-any': 'warn',
		'typescript/no-base-to-string': 'warn',
		'typescript/no-redundant-type-constituents': 'warn',
		'typescript/no-restricted-types': 'warn',
		'typescript/no-unsafe-enum-comparison': 'warn',
		'typescript/no-unsafe-declaration-merging': 'warn',
		'typescript/only-throw-error': 'warn',
		'typescript/no-require-imports': 'warn',
		'typescript/array-type': 'warn',
		'no-useless-escape': 'warn',
		'typescript/no-duplicate-type-constituents': 'warn',
	},
	overrides: [
		{
			// Public API guardrail: handlers/controllers must go through a service, never a repository.
			files: ['./src/public-api/v1/handlers/**/*.ts', './src/public-api/v1/controllers/**/*.ts'],
			excludeFiles: ['./src/public-api/**/__tests__/**/*.ts'],
			rules: {
				'n8n-local-rules/no-repository-in-public-api-handler': 'error',
			},
		},
		{
			// Public API guardrail: new endpoints must be `@PublicApiController` classes, not `export =` tuples.
			files: [
				'./src/public-api/v1/handlers/**/*.handler.ts',
				'./src/public-api/v1/handlers/**/*.handler.ee.ts',
			],
			rules: {
				'n8n-local-rules/require-public-api-controller': 'error',
			},
		},
		{
			// Ratchet allowlist: legacy `export =` handler tuples pending migration to
			// `@PublicApiController` classes (API-70). NEVER add to this list — a new tuple handler
			// must fail CI. Entries are removed as each handler becomes a controller.
			files: [
				'./src/public-api/v1/handlers/evaluations/evaluations.handler.ts',
				'./src/public-api/v1/handlers/log-streaming/log-streaming.handler.ts',
				'./src/public-api/v1/handlers/n8n-packages/n8n-packages.handler.ts',
			],
			rules: {
				'n8n-local-rules/require-public-api-controller': 'off',
			},
		},
		{
			files: ['./src/**/*.ts'],
			excludeFiles: ['./src/modules/engine-v2/**/*.ts'],
			rules: {
				// Repeats the policy restriction: a later block replaces the rule's options
				// wholesale rather than merging them.
				'no-restricted-imports': [
					'error',
					{
						paths: [
							POLICY_INTERNAL_RESTRICTION,
							engineV2ModuleOnlyImport,
							jsonwebtokenSigningRestriction,
						],
						patterns: [jsonwebtokenSubpathRestriction],
					},
				],
			},
		},
		{
			files: ['./src/modules/instance-ai/**/*.ts'],
			excludeFiles: ['./src/modules/instance-ai/**/__tests__/**/*.ts'],
			rules: {
				// Repeats the engine restriction: a later block replaces the rule's options
				// wholesale rather than merging them.
				'no-restricted-imports': [
					'error',
					{
						paths: [
							POLICY_INTERNAL_RESTRICTION,
							...instanceAiLazyRuntimeImports,
							engineV2ModuleOnlyImport,
							jsonwebtokenSigningRestriction,
						],
						patterns: [jsonwebtokenSubpathRestriction],
					},
				],
			},
		},
		{
			files: ['./src/modules/instance-ai/web-research/fetch-and-extract.ts'],
			// This file loads pdf-parse lazily inside extractPdf().
			rules: { 'no-restricted-imports': 'off' },
		},
		{
			files: ['./src/modules/agents/runtime/agent-isolate-pool.ts'],
			rules: { 'prefer-const': 'off' },
		},
		{
			// engine-v2 owns `@n8n/engine`, so the block above skips it wholesale — which
			// would drop the JWT restriction too. Reinstate it here, without the engine
			// restriction these files are exempt from.
			files: ['./src/modules/engine-v2/**/*.ts'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: [POLICY_INTERNAL_RESTRICTION, jsonwebtokenSigningRestriction],
						patterns: [jsonwebtokenSubpathRestriction],
					},
				],
			},
		},
		{
			// The two places that hold the raw signing API. NEVER add to this list.
			files: [
				// Owns the signing key and derives every audience from a purpose.
				'./src/services/jwt.service.ts',
				// Verifies subject tokens with a foreign key from the trusted-key store,
				// against the audience that key is registered for.
				'./src/modules/token-exchange/services/token-exchange.service.ts',
			],
			rules: {
				'no-restricted-imports': [
					'error',
					{ paths: [POLICY_INTERNAL_RESTRICTION, engineV2ModuleOnlyImport] },
				],
			},
		},
		{
			// Tests mint tokens as fixtures, including malformed ones a purpose cannot express.
			files: ['./src/**/__tests__/**/*.ts'],
			rules: {
				'no-restricted-imports': [
					'error',
					{ paths: [POLICY_INTERNAL_RESTRICTION, engineV2ModuleOnlyImport] },
				],
			},
		},
		{
			// engine-v2 tests reach for `@n8n/engine` the same way the module does, and
			// the tests block above would reinstate the restriction they are exempt from.
			files: ['./src/modules/engine-v2/**/__tests__/**/*.ts'],
			rules: {
				'no-restricted-imports': ['error', { paths: [POLICY_INTERNAL_RESTRICTION] }],
			},
		},
		{
			// Only the PEP may import the clearance minter.
			files: ['./src/policy/policy-enforcement.service.ts'],
			rules: { 'no-restricted-imports': 'off' },
		},
		{
			files: ['./src/databases/migrations/**/*.ts'],
			rules: {
				'unicorn/filename-case': 'off',
			},
		},
		{
			// Sanctioned `@OnLeaderTakeover` users. Permanent, but additions need review:
			// the system task runner itself, services that hold live resources on the
			// leader (webhooks, pollers, sockets, queue consumers), and services that
			// run a documented one-shot catch-up pass on takeover.
			files: [
				'./src/scheduling/system-tasks/system-task-runner.ts',
				'./src/active-workflow-manager.ts',
				'./src/metrics/prometheus/instance-role-metrics.service.ts',
				'./src/scaling/scaling.service.ts',
				'./src/wait-tracker.ts',
				'./src/workflows/publication/workflow-publication-outbox-consumer.ts',
				'./src/workflows/publication/workflow-publication-reconciler.service.ts',
				'./src/modules/agents/agent-task.service.ts',
				'./src/modules/agents/integrations/agent-channel-reconciler.service.ts',
				'./src/modules/agents/integrations/leader-channel-relay.service.ts',
				'./src/modules/agents/integrations/platforms/discord-integration.ts',
				'./src/modules/token-exchange/services/trusted-key.service.ts',
				'./src/services/pruning/workflow-history-compaction.service.ts',
			],
			rules: { 'n8n-local-rules/no-on-leader-takeover': 'off' },
		},
		{
			// Shrink-only ratchet: periodic leader timers not yet migrated to system
			// tasks. NEVER add to this list — new periodic leader work must be a
			// @SystemTask() class. Entries are removed as each migrates on its own ticket.
			files: ['./src/services/pruning/executions-pruning.service.ts'],
			rules: { 'n8n-local-rules/no-on-leader-takeover': 'off' },
		},
		{
			files: ['./test/**/*.ts', './src/**/__tests__/**/*.ts'],
			rules: {
				'n8n-local-rules/no-type-unsafe-event-emitter': 'off',
				'n8n-local-rules/no-on-leader-takeover': 'off',
			},
		},
		{
			files: ['./src/decorators/**/*.ts'],
			rules: {
				'typescript/no-restricted-types': 'warn',
			},
		},
		{
			files: ['./test/**/*.ts', './src/**/__tests__/**/*.ts'],
			rules: {
				// Allow inline `typeof import('x')` type annotations — the idiomatic shape for
				// `vi.importActual<typeof import('x')>('x')` in mock factories.
				'id-denylist': 'warn',
				'prefer-const': 'warn',
				'n8n-local-rules/no-dynamic-import-template': 'off',
				'import/no-duplicates': 'warn',
				'no-unused-expressions': 'off',
				'typescript/restrict-template-expressions': 'warn',
			},
		},
		{
			files: ['**/*.module.ts'],

			rules: {
				'n8n-local-rules/no-top-level-relative-imports-in-backend-module': 'error',
				'n8n-local-rules/no-constructor-in-backend-module': 'error',
			},
		},
	],
});
