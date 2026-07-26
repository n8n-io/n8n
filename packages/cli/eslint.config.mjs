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

export default defineConfig(
	globalIgnores(['scripts/**/*.mjs', 'vitest.*.ts', 'coverage/**']),
	nodeConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			'n8n-local-rules/no-dynamic-import-template': 'error',
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
			// The allowlist below is the only place @n8n/typeorm exceptions may live; block inline disables.
			'n8n-local-rules/no-misplaced-typeorm-import-disable': 'error',
			'n8n-local-rules/no-type-unsafe-event-emitter': 'error',
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
		files: ['./src/modules/instance-ai/**/*.ts'],
		ignores: ['./src/modules/instance-ai/**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{ paths: instanceAiLazyRuntimeImports },
			],
		},
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
			'./src/public-api/v1/handlers/executions/executions.handler.ts',
			'./src/public-api/v1/handlers/tags/tags.handler.ts',
			'./src/public-api/v1/handlers/users/users.service.ee.ts',
			'./src/public-api/v1/handlers/workflows/workflows.handler.ts',
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
		files: ['./test/**/*.ts', './src/**/__tests__/**/*.ts'],
		rules: {
			'n8n-local-rules/no-type-unsafe-event-emitter': 'off',
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
