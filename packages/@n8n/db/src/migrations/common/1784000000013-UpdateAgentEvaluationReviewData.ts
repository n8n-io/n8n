import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const EVALUATION_CASE_TABLE = 'agent_evaluation_case';
const EXECUTION_TABLE = 'agent_execution';
const REJECTION_REASON_COLUMN = 'rejectionReason';
const CURRENT_REJECTION_REASONS = ['wrong_answer', 'wrong_tool_calling', 'other'];
const LEGACY_REJECTION_REASONS = [
	'incorrect_answer',
	'incomplete_answer',
	'wrong_tool',
	'missing_tool',
	'hallucination',
	'bad_format',
	'unsafe_behavior',
	'other',
];

function enumCheckExpression(columnName: string, values: string[]) {
	return `${columnName} IN (${values.map((value) => `'${value}'`).join(', ')})`;
}

export class UpdateAgentEvaluationReviewData1784000000013 implements ReversibleMigration {
	async up({
		escape,
		isPostgres,
		queryRunner,
		runQuery,
		tablePrefix,
		schemaBuilder: { addColumns, addNotNull, column, createIndex },
	}: MigrationContext) {
		await addColumns(EXECUTION_TABLE, [column('agentVersionId').varchar(255)]);

		const executionTable = escape.tableName(EXECUTION_TABLE);
		const threadTable = escape.tableName('agent_execution_threads');
		const agentTable = escape.tableName('agents');
		const agentVersionId = escape.columnName('agentVersionId');
		const executionThreadId = escape.columnName('threadId');
		const threadId = escape.columnName('id');
		const threadAgentId = escape.columnName('agentId');
		const agentId = escape.columnName('id');
		const versionId = escape.columnName('versionId');
		const updatedAt = escape.columnName('updatedAt');
		const fallbackVersion = isPostgres
			? `${agentTable}.${updatedAt}::text`
			: `${agentTable}.${updatedAt}`;

		await runQuery(`
			UPDATE ${executionTable}
			SET ${agentVersionId} = (
				SELECT COALESCE(${agentTable}.${versionId}, ${fallbackVersion})
				FROM ${threadTable}
				INNER JOIN ${agentTable}
					ON ${agentTable}.${agentId} = ${threadTable}.${threadAgentId}
				WHERE ${threadTable}.${threadId} = ${executionTable}.${executionThreadId}
			)
			WHERE ${agentVersionId} IS NULL
		`);

		await addNotNull(EXECUTION_TABLE, 'agentVersionId');
		await createIndex(EXECUTION_TABLE, ['agentVersionId', 'createdAt']);

		await addColumns(EVALUATION_CASE_TABLE, [
			column('conversationId').varchar(36),
			column('toolCallCorrection').json,
		]);

		const reviewTable = escape.tableName(EVALUATION_CASE_TABLE);
		const conversationId = escape.columnName('conversationId');
		const reviewExecutionId = escape.columnName('executionId');
		const executionId = escape.columnName('id');
		const rejectionReason = escape.columnName(REJECTION_REASON_COLUMN);
		const checkName = `CHK_${tablePrefix}${EVALUATION_CASE_TABLE}_${REJECTION_REASON_COLUMN}`;
		const fullReviewTableName = `${tablePrefix}${EVALUATION_CASE_TABLE}`;

		await runQuery(`
			UPDATE ${reviewTable}
			SET ${conversationId} = (
				SELECT ${executionTable}.${executionThreadId}
				FROM ${executionTable}
				WHERE ${executionTable}.${executionId} = ${reviewTable}.${reviewExecutionId}
			)
			WHERE ${conversationId} IS NULL
		`);

		await addNotNull(EVALUATION_CASE_TABLE, 'conversationId');

		await queryRunner.dropCheckConstraint(fullReviewTableName, checkName);
		await runQuery(`
			UPDATE ${reviewTable}
			SET ${rejectionReason} = CASE
				WHEN ${rejectionReason} IN ('incorrect_answer', 'incomplete_answer') THEN 'wrong_answer'
				WHEN ${rejectionReason} IN ('wrong_tool', 'missing_tool') THEN 'wrong_tool_calling'
				WHEN ${rejectionReason} IS NULL THEN NULL
				ELSE 'other'
			END
		`);
		await queryRunner.createCheckConstraint(
			fullReviewTableName,
			new TableCheck({
				name: checkName,
				expression: enumCheckExpression(rejectionReason, CURRENT_REJECTION_REASONS),
			}),
		);
	}

	async down({
		escape,
		queryRunner,
		runQuery,
		tablePrefix,
		schemaBuilder: { dropColumns, dropIndex },
	}: MigrationContext) {
		const reviewTable = escape.tableName(EVALUATION_CASE_TABLE);
		const rejectionReason = escape.columnName(REJECTION_REASON_COLUMN);
		const checkName = `CHK_${tablePrefix}${EVALUATION_CASE_TABLE}_${REJECTION_REASON_COLUMN}`;
		const fullReviewTableName = `${tablePrefix}${EVALUATION_CASE_TABLE}`;

		await queryRunner.dropCheckConstraint(fullReviewTableName, checkName);
		await runQuery(`
			UPDATE ${reviewTable}
			SET ${rejectionReason} = CASE
				WHEN ${rejectionReason} = 'wrong_answer' THEN 'incorrect_answer'
				WHEN ${rejectionReason} = 'wrong_tool_calling' THEN 'wrong_tool'
				ELSE ${rejectionReason}
			END
		`);
		await queryRunner.createCheckConstraint(
			fullReviewTableName,
			new TableCheck({
				name: checkName,
				expression: enumCheckExpression(rejectionReason, LEGACY_REJECTION_REASONS),
			}),
		);
		await dropColumns(EVALUATION_CASE_TABLE, ['conversationId', 'toolCallCorrection']);
		await dropIndex(EXECUTION_TABLE, ['agentVersionId', 'createdAt']);
		await dropColumns(EXECUTION_TABLE, ['agentVersionId']);
	}
}
