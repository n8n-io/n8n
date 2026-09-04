import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';
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

const engineV2ModuleOnlyImport = {
	name: '@n8n/engine',
	allowTypeImports: true,
	message:
		'Only src/modules/engine-v2/** may import @n8n/engine at runtime. Use a type import, or reach the engine through EngineDataPlaneProxyService.',
};

export default defineConfig(
	globalIgnores(['scripts/**/*.mjs', 'vitest.*.ts', 'coverage/**']),
	nodeConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			'n8n-local-rules/no-dynamic-import-template': 'error',
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
			// Ratchets: the allowlists below only shrink, so an inline disable is the one way to add a
			// violation. `no-unsealed-workflow-entity-write` (on for every package via the plugin) has none.
			'n8n-local-rules/no-guardrail-disable': [
				'error',
				{
					guarded: [
						{
							rule: 'misplaced-n8n-typeorm-import',
							message:
								'Keep TypeORM in the persistence layer: put the query behind a use-case repository method in @n8n/db.',
						},
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
					],
				},
			],
			'n8n-local-rules/no-type-unsafe-event-emitter': 'error',
			// Periodic leader-only work must be a @SystemTask() class; hand-rolled
			// @OnLeaderTakeover timers are reserved for the allowlisted services below.
			'n8n-local-rules/no-on-leader-takeover': 'error',
			// The clearance minter lives on the `policy-internal` subpath, off the public barrel.
			// Only PolicyEnforcementService may reach it; callers use enforce*/evaluate*.
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{ paths: [POLICY_INTERNAL_RESTRICTION] },
			],
			'n8n-local-rules/project-owned-entity-transfer': [
				'error',
				{ acknowledged: acknowledgedProjectOwnedEntities },
			],
			// Disabled until we have a plan on how to fix these issues long term
			'n8n-local-rules/no-import-enterprise-edition': 'off',

			// TODO: Remove this
			'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
			'import-x/no-cycle': 'warn',
			'import-x/extensions': [
				'warn',
				'never',
				{
					pathGroupOverrides: [
						{
							pattern:
								'**/*.{service,controller,registry,repository,entity,dto,middleware,module,strategy,handler,helper,error,request,response,mapper,schema,types,constants,config,util,utils}',
							action: 'ignore',
						},
					],
				},
			],
			'import-x/order': 'warn',
			'no-ex-assign': 'warn',
			'no-case-declarations': 'warn',
			'no-fallthrough': 'warn',
			'no-unsafe-optional-chaining': 'warn',
			'no-empty': 'warn',
			'no-async-promise-executor': 'warn',
			complexity: 'warn',
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/prefer-promise-reject-errors': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/no-restricted-types': 'warn',
			'@typescript-eslint/no-unsafe-enum-comparison': 'warn',
			'@typescript-eslint/no-unsafe-declaration-merging': 'warn',
			'@typescript-eslint/only-throw-error': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/array-type': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'no-useless-escape': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/no-duplicate-type-constituents': 'warn',
		},
	},
	{
		// Public API guardrail: handlers/controllers must go through a service, never a repository.
		files: ['./src/public-api/v1/handlers/**/*.ts', './src/public-api/v1/controllers/**/*.ts'],
		ignores: ['./src/public-api/**/__tests__/**/*.ts'],
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
		// Ratchet allowlist: handlers/services still reaching a repository directly, pending
		// migration to the `@PublicApiController` + service pattern (API-70). NEVER add to this
		// list — a new violation must fail CI. Entries are removed as each file migrates.
		files: [
			'./src/public-api/v1/handlers/data-tables/data-tables.handler.ts',
			'./src/public-api/v1/handlers/data-tables/data-tables.service.ts',
			'./src/public-api/v1/handlers/projects/projects.handler.ts',
		],
		rules: {
			'n8n-local-rules/no-repository-in-public-api-handler': 'off',
		},
	},
	{
		// Ratchet allowlist: legacy `export =` handler tuples pending migration to
		// `@PublicApiController` classes (API-70). NEVER add to this list — a new tuple handler
		// must fail CI. Entries are removed as each handler becomes a controller.
		files: [
			'./src/public-api/v1/handlers/audit/audit.handler.ts',
			'./src/public-api/v1/handlers/community-packages/community-packages.handler.ts',
			'./src/public-api/v1/handlers/credentials/credentials.handler.ts',
			'./src/public-api/v1/handlers/data-tables/data-tables.columns.handler.ts',
			'./src/public-api/v1/handlers/data-tables/data-tables.handler.ts',
			'./src/public-api/v1/handlers/data-tables/data-tables.rows.handler.ts',
			'./src/public-api/v1/handlers/discover/discover.handler.ts',
			'./src/public-api/v1/handlers/evaluations/evaluations.handler.ts',
			'./src/public-api/v1/handlers/executions/executions.handler.ts',
			'./src/public-api/v1/handlers/folders/folders.handler.ts',
			'./src/public-api/v1/handlers/insights/insights.handler.ts',
			'./src/public-api/v1/handlers/ldap/ldap.handler.ts',
			'./src/public-api/v1/handlers/log-streaming/log-streaming.handler.ts',
			'./src/public-api/v1/handlers/n8n-packages/n8n-packages.handler.ts',
			'./src/public-api/v1/handlers/otel/otel.handler.ts',
			'./src/public-api/v1/handlers/projects/projects.handler.ts',
			'./src/public-api/v1/handlers/security-policy/security-policy.handler.ts',
			'./src/public-api/v1/handlers/source-control/source-control.handler.ts',
			'./src/public-api/v1/handlers/sso-oidc/sso-oidc.handler.ts',
			'./src/public-api/v1/handlers/sso-saml/sso-saml.handler.ts',
			'./src/public-api/v1/handlers/tags/tags.handler.ts',
			'./src/public-api/v1/handlers/users/users.handler.ee.ts',
			'./src/public-api/v1/handlers/variables/variables.handler.ts',
			'./src/public-api/v1/handlers/workflows/workflows.handler.ts',
		],
		rules: {
			'n8n-local-rules/require-public-api-controller': 'off',
		},
	},
	{
		files: ['./src/**/*.ts'],
		ignores: ['./src/modules/engine-v2/**/*.ts'],
		rules: {
			// Repeats the policy restriction: a later block replaces the rule's options
			// wholesale rather than merging them.
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{ paths: [POLICY_INTERNAL_RESTRICTION, engineV2ModuleOnlyImport] },
			],
		},
	},
	{
		files: ['./src/modules/instance-ai/**/*.ts'],
		ignores: ['./src/modules/instance-ai/**/__tests__/**/*.ts'],
		rules: {
			// Repeats the engine restriction: a later block replaces the rule's options
			// wholesale rather than merging them.
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					paths: [
						POLICY_INTERNAL_RESTRICTION,
						...instanceAiLazyRuntimeImports,
						engineV2ModuleOnlyImport,
					],
				},
			],
		},
	},
	{
		// Only the PEP may import the clearance minter.
		files: ['./src/policy/policy-enforcement.service.ts'],
		rules: { '@typescript-eslint/no-restricted-imports': 'off' },
	},
	{
		files: ['./src/databases/migrations/**/*.ts'],
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
	{
		// @n8n/typeorm belongs in the persistence layer; exempt entities/repositories.
		// Path-based (not suffix-only) so entity files without the `.entity.ts` suffix are covered.
		files: [
			'./src/databases/**/*.ts',
			'./src/modules/**/database/entities/**/*.ts',
			'./src/modules/**/database/repositories/**/*.ts',
			'./src/modules/**/*.entity.ts',
			'./src/modules/**/*.repository.ts',
			'./test/**/*.ts',
			'./src/**/__tests__/**/*.ts',
		],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
		},
	},
	{
		// Permanent: legitimate TypeORM use outside the persistence tree. Do not remove.
		// - db/revert.ts: MigrationExecutor (CLI migration tooling)
		// - security-audit.repository.ts: PackagesRepository, relocation tracked separately
		files: ['./src/commands/db/revert.ts', './src/security-audit/security-audit.repository.ts'],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
		},
	},
	{
		// Ratchet allowlist: known @n8n/typeorm leaks pending migration to @n8n/db.
		// NEVER add to this list — a new leak must fail CI. Entries are removed as each file migrates.
		files: [
			// credentials/
			'./src/credentials-helper.ts',
			'./src/credentials/credential-connection-status-provider.interface.ts',
			'./src/credentials/credential-connection-status-proxy.ts',
			'./src/credentials/credential-dependency.service.ts',
			'./src/credentials/credentials-finder.service.ts',
			'./src/credentials/credentials.controller.ts',
			'./src/credentials/credentials.service.ee.ts',
			'./src/credentials/credentials.service.ts',
			// workflows/
			'./src/workflows/workflow-finder.service.ts',
			'./src/workflows/workflow-history/workflow-history.service.ts',
			'./src/workflows/workflow-sharing.service.ts',
			'./src/workflows/workflow-validation.service.ts',
			'./src/workflows/workflow.service.ee.ts',
			'./src/workflows/workflow.service.ts',
			'./src/workflows/workflows.controller.ts',
			// services/ (incl. ownership.service.ts — surfaced only by the deep-path prefix change)
			'./src/services/export.service.ts',
			'./src/services/folder.service.ts',
			'./src/services/folder-finder.service.ts',
			'./src/services/hooks.service.ts',
			'./src/services/import.service.ts',
			'./src/services/ownership.service.ts',
			'./src/services/ownership-transfer/ownership-transfer-handler.registry.ts',
			'./src/services/project.service.ee.ts',
			'./src/services/public-api-key.service.ts',
			'./src/services/tag.service.ts',
			// commands / controllers / eventbus / evaluation / public-api
			'./src/commands/import/credentials.ts',
			'./src/commands/ldap/reset.ts',
			'./src/controllers/project.controller.ts',
			'./src/eventbus/message-event-bus/message-event-bus.ts',
			'./src/evaluation.ee/evaluation-collection.service.ts',
			'./src/evaluation.ee/test-runner/test-runner.service.ee.ts',
			'./src/public-api/v1/handlers/tags/tags.handler.ts',
			// modules/** non-persistence services surfaced by narrowing the exemption
			'./src/modules/agents/agent-knowledge.service.ts',
			'./src/modules/agents/agent-publish.service.ts',
			'./src/modules/agents/agent-task.service.ts',
			'./src/modules/agents/builder/agents-builder.service.ts',
			'./src/modules/agents/instance-ai-builder-delegate.adapter.ts',
			'./src/modules/agents/integrations/n8n-memory.ts',
			'./src/modules/agents/tools/workflow-tool-workflow-resolver.ts',
			'./src/modules/breaking-changes/breaking-changes.service.ts',
			'./src/modules/chat-hub/chat-hub-credentials.service.ts',
			'./src/modules/chat-hub/chat-hub-workflow.service.ts',
			'./src/modules/chat-hub/chat-hub.attachment.service.ts',
			'./src/modules/data-table/data-table-ddl.service.ts',
			'./src/modules/data-table/data-table.service.ts',
			'./src/modules/data-table/utils/sql-utils.ts',
			'./src/modules/dynamic-credentials.ee/services/credential-connection-status.service.ts',
			'./src/modules/dynamic-credentials.ee/services/credential-resolver.service.ts',
			'./src/modules/external-secrets.ee/secrets-providers-connections.service.ee.ts',
			'./src/modules/favorites/favorites.service.ts',
			'./src/modules/insights/insights-collection.service.ts',
			'./src/modules/instance-ai/instance-ai.adapter.service.ts',
			'./src/modules/instance-ai/mcp/instance-ai-mcp-registry.service.ts',
			'./src/modules/instance-ai/storage/typeorm-agent-checkpoint-store.ts',
			'./src/modules/instance-ai/storage/typeorm-agent-memory.ts',
			'./src/modules/instance-ai/storage/typeorm-observation-log-store.ts',
			'./src/modules/instance-ai/suspended-thread-persistence.service.ts',
			'./src/modules/log-streaming.ee/log-streaming-destination.service.ts',
			'./src/modules/mcp/mcp-api-key.service.ts',
			'./src/modules/mcp/mcp.settings.service.ts',
			'./src/modules/oauth-jwe/oauth-jwe-key.service.ts',
			'./src/modules/provisioning.ee/provisioning.service.ee.ts',
			'./src/modules/provisioning.ee/role-mapping-rule.service.ee.ts',
			'./src/modules/provisioning.ee/role-resolver.service.ee.ts',
			'./src/modules/source-control.ee/source-control-context.factory.ts',
			'./src/modules/source-control.ee/source-control-export.service.ee.ts',
			'./src/modules/source-control.ee/source-control-import.service.ee.ts',
			'./src/modules/source-control.ee/source-control-scoped.service.ts',
			'./src/modules/source-control.ee/source-control-status.service.ee.ts',
			'./src/modules/token-exchange/services/trusted-key.service.ts',
			'./src/modules/workflow-index/workflow-dependency-query.service.ts',
		],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
		},
	},
	{
		// Ratchet allowlist: known relabel leaks — business logic importing a TypeORM
		// operator/driver type (`In`, `Not`, `EntityManager`, `FindOptionsWhere`, …) from
		// `@n8n/db` instead of `@n8n/typeorm`. Same rule, same shrink-only contract:
		// NEVER add to this list — a new relabel must fail CI. Entries removed as each file
		// drops TypeORM in favor of a use-case repository method.
		files: [
			'./src/binary-data/database.manager.ts',
			'./src/events/relays/telemetry.event-relay.ts',
			'./src/executions/execution-data/db-store.ts',
			'./src/executions/execution-persistence.ts',
			'./src/executions/execution-recovery.service.ts',
			'./src/executions/execution.service.ts',
			'./src/instance-settings-loader/loaders/log-streaming.instance-settings-loader.ts',
			'./src/modules/agents/agents.service.ts',
			'./src/modules/chat-hub/chat-hub-agent.service.ts',
			'./src/modules/chat-hub/chat-hub-title.service.ts',
			'./src/modules/chat-hub/chat-hub-tool.service.ts',
			'./src/modules/chat-hub/chat-hub.models.service.ts',
			'./src/modules/chat-hub/chat-hub.service.ts',
			'./src/modules/chat-hub/chat-hub.settings.service.ts',
			'./src/modules/dynamic-credentials.ee/services/credential-resolver-workflow.service.ts',
			'./src/permissions.ee/check-access.ts',
			'./src/scheduling/durable-job-provisioner.ts',
			'./src/scheduling/durable-scheduler.ts',
			'./src/scheduling/poll-trigger-node/poll-trigger-job-registrar.ts',
			'./src/scheduling/schedule-trigger-node/schedule-trigger-job-registrar.ts',
			'./src/security-audit/risk-reporters/credentials-risk-reporter.ts',
			'./src/services/role-cache.service.ts',
			'./src/services/role.service.ts',
			'./src/services/user.service.ts',
			'./src/workflows/workflow-creation.service.ts',
		],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
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
		],
		rules: { 'n8n-local-rules/no-on-leader-takeover': 'off' },
	},
	{
		// Shrink-only ratchet: periodic leader timers not yet migrated to system
		// tasks. NEVER add to this list — new periodic leader work must be a
		// @SystemTask() class. Entries are removed as each migrates on its own ticket.
		files: [
			'./src/license.ts',
			'./src/modules/agents/integrations/n8n-checkpoint-storage.ts',
			'./src/modules/insights/insights.service.ts',
			'./src/modules/instance-ai/instance-ai.service.ts',
			'./src/modules/instance-registry/checks/check.service.ts',
			'./src/modules/instance-registry/stale-member-cleanup.service.ts',
			'./src/modules/mcp-registry/registry/mcp-registry.service.ts',
			'./src/modules/token-exchange/services/jti-cleanup.service.ts',
			'./src/modules/token-exchange/services/trusted-key.service.ts',
			'./src/services/pruning/executions-pruning.service.ts',
			'./src/services/pruning/workflow-history-compaction.service.ts',
			'./src/services/workflow-statistics-rollup.service.ts',
			'./src/workflows/publication/workflow-publication-outbox-cleanup.service.ts',
		],
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
			'@typescript-eslint/no-restricted-types': [
				'warn',
				{
					types: {
						Function: false,
					},
				},
			],
		},
	},
	{
		files: ['./test/**/*.ts', './src/**/__tests__/**/*.ts'],
		rules: {
			// Allow inline `typeof import('x')` type annotations — the idiomatic shape for
			// `vi.importActual<typeof import('x')>('x')` in mock factories.
			'@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
			'id-denylist': 'warn',
			'prefer-const': 'warn',
			'n8n-local-rules/no-dynamic-import-template': 'off',
			'import-x/no-duplicates': 'warn',
			'import-x/no-default-export': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'n8n-local-rules/no-uncaught-json-parse': 'warn',
		},
	},
	{
		files: ['**/*.module.ts'],

		rules: {
			'n8n-local-rules/no-top-level-relative-imports-in-backend-module': 'error',
			'n8n-local-rules/no-constructor-in-backend-module': 'error',
		},
	},
);
