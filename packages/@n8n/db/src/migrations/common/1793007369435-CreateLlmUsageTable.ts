import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'llm_usage';

/**
 * One row per captured LLM call. The ID columns are soft references without
 * foreign keys: rows are written in batches after the call, the target can be
 * deleted by then, and cost history must outlive workflows and projects.
 */
export class CreateLlmUsageTable1793007369435 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('callId')
					.varchar(64)
					.primary.notNull.comment(
						'Call identity: SHA-256 of provider, response ID, model and token counts, else a UUIDv7',
					),
				column('startedAt').timestampTimezone(3),
				column('finishedAt').timestampTimezone(3).notNull,
				column('durationMs').int,
				column('callerType')
					.varchar(32)
					// The values of `LlmCallerType` in `@n8n/ai-utilities/llm-usage`.
					.notNull.withEnumCheck(['node', 'agent', 'instance-ai', 'workflow-builder', 'unknown'])
					.comment('What made the call: a workflow node, an agent, Instance AI or the builder'),
				column('subType')
					.varchar(32)
					.withEnumCheck(['llm', 'http'])
					.comment('How the call was captured: llm (an AI library) or http (a node HTTP request)'),
				column('workflowId').varchar(36),
				column('executionId').varchar(36),
				column('executionMode')
					.varchar(32)
					.comment('Mode of the run that started the work, for example manual or trigger'),
				column('nodeName').text,
				column('nodeType').text,
				column('agentId').varchar(36),
				column('threadId').varchar(128),
				column('projectId').varchar(36),
				column('userId').uuid,
				column('credentialId').varchar(36),
				column('managedBy')
					.varchar(32)
					// The values of `LlmUsageCredential.managedBy` in `@n8n/ai-utilities/llm-usage`.
					.withEnumCheck(['aiGateway', 'assistant'])
					.comment('Set when n8n credits pay for the call instead of a credential'),
				column('provider').varchar(64).notNull,
				column('model').varchar(255).notNull,
				column('providerResponseId').varchar(255),
				column('inputTokens').int.notNull.default(0),
				column('outputTokens').int.notNull.default(0),
				column('cacheReadTokens').int.notNull.default(0),
				column('cacheWriteTokens').int.notNull.default(0),
				column('estimatedCostUsd').double.comment('Estimated cost in USD; NULL when not priced'),
				column('priced').bool.notNull.default(false),
			)
			// Every query reads a time range. Add an index when a query needs another one.
			.withIndexOn('finishedAt');

		// Repricing reads the unpriced calls in call ID order. Without this index each page walks
		// the whole table. Few calls stay unpriced, so the index stays small.
		await createIndex(tableName, ['callId'], false, undefined, '"priced" = false');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
