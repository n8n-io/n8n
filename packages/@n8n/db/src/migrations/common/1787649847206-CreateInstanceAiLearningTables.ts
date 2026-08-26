import type { MigrationContext, ReversibleMigration } from '../migration-types';

const RUN_TABLE = 'instance_ai_learning_runs';
const LEARNING_TABLE = 'instance_ai_learnings';

export class CreateInstanceAiLearningTables1787649847206 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(RUN_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('projectId').varchar(36).notNull,
				column('createdById').uuid.notNull,
				column('status')
					.varchar(16)
					.notNull.withEnumCheck(['queued', 'running', 'completed', 'error'])
					.comment('Analysis run lifecycle'),
				column('stage')
					.varchar(16)
					.notNull.withEnumCheck(['observe', 'reduce', 'completed'])
					.comment('Current analysis pipeline stage'),
				column('workflowIds').json.notNull.comment('Workflow IDs selected when the run started'),
				column('observations').json.comment('Per-workflow observation documents'),
				column('totalWorkflows').int.notNull,
				column('completedWorkflows').int.notNull.default(0),
				column('error').text,
			)
			.withIndexOn(['projectId', 'createdAt'])
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(LEARNING_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('projectId').varchar(36).notNull,
				column('runId').varchar(36).notNull,
				column('statement').text.notNull,
				column('kind')
					.varchar(32)
					.notNull.withEnumCheck(['preference', 'environment_fact', 'hypothesis'])
					.comment('Learning classification'),
				column('appliesWhen').text.notNull,
				column('confidence').double.notNull,
				column('sensitivity')
					.varchar(16)
					.notNull.withEnumCheck(['internal', 'public', 'sensitive'])
					.comment('Model-assigned handling classification'),
				column('transferability').text.notNull,
				column('evidence').json.notNull.comment(
					'Workflow and observation IDs supporting the learning',
				),
				column('reviewStatus')
					.varchar(16)
					.notNull.default("'pending'")
					.withEnumCheck(['pending', 'approved', 'rejected'])
					.comment('Human review decision'),
				column('enabled').bool.notNull.default(false),
				column('reviewedById').uuid,
				column('reviewedAt').timestampTimezone(),
			)
			.withIndexOn(['projectId', 'reviewStatus', 'enabled'])
			.withIndexOn('runId')
			.withIndexOn('reviewedById')
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('runId', {
				tableName: RUN_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('reviewedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(LEARNING_TABLE);
		await dropTable(RUN_TABLE);
	}
}
