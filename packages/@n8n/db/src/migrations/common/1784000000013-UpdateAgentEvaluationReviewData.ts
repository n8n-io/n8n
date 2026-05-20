import { TableCheck, type QueryRunner } from '@n8n/typeorm';

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

async function tableHasColumn(queryRunner: QueryRunner, tableName: string, columnName: string) {
	const table = await queryRunner.getTable(tableName);
	return table?.findColumnByName(columnName) !== undefined;
}

async function columnAllowsNull(queryRunner: QueryRunner, tableName: string, columnName: string) {
	const table = await queryRunner.getTable(tableName);
	return table?.findColumnByName(columnName)?.isNullable ?? false;
}

async function tableHasIndex(queryRunner: QueryRunner, tableName: string, indexName: string) {
	const table = await queryRunner.getTable(tableName);
	return table?.indices.some((index) => index.name === indexName) ?? false;
}

async function tableHasCheck(queryRunner: QueryRunner, tableName: string, checkName: string) {
	const table = await queryRunner.getTable(tableName);
	return table?.checks.some((check) => check.name === checkName) ?? false;
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

		if (!(await tableHasColumn(queryRunner, executionTable, 'agentVersionId'))) {
			await addColumns(EXECUTION_TABLE, [column('agentVersionId').varchar(255)]);
		}

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

		if (await columnAllowsNull(queryRunner, executionTable, 'agentVersionId')) {
			await addNotNull(EXECUTION_TABLE, 'agentVersionId');
		}
		const executionVersionIndex = `IDX_${tablePrefix}${EXECUTION_TABLE}_agentVersionId_createdAt`;
		if (!(await tableHasIndex(queryRunner, executionTable, executionVersionIndex))) {
			await createIndex(EXECUTION_TABLE, ['agentVersionId', 'createdAt']);
		}

		const reviewTable = escape.tableName(EVALUATION_CASE_TABLE);
		const conversationId = escape.columnName('conversationId');
		const reviewExecutionId = escape.columnName('executionId');
		const executionId = escape.columnName('id');
		const rejectionReason = escape.columnName(REJECTION_REASON_COLUMN);
		const checkName = `CHK_${tablePrefix}${EVALUATION_CASE_TABLE}_${REJECTION_REASON_COLUMN}`;
		const fullReviewTableName = `${tablePrefix}${EVALUATION_CASE_TABLE}`;

		if (!(await tableHasColumn(queryRunner, reviewTable, 'conversationId'))) {
			await addColumns(EVALUATION_CASE_TABLE, [column('conversationId').varchar(36)]);
		}
		if (!(await tableHasColumn(queryRunner, reviewTable, 'toolCallCorrection'))) {
			await addColumns(EVALUATION_CASE_TABLE, [column('toolCallCorrection').json]);
		}

		await runQuery(`
			UPDATE ${reviewTable}
			SET ${conversationId} = (
				SELECT ${executionTable}.${executionThreadId}
				FROM ${executionTable}
				WHERE ${executionTable}.${executionId} = ${reviewTable}.${reviewExecutionId}
			)
			WHERE ${conversationId} IS NULL
		`);

		if (await columnAllowsNull(queryRunner, reviewTable, 'conversationId')) {
			await addNotNull(EVALUATION_CASE_TABLE, 'conversationId');
		}

		if (await tableHasCheck(queryRunner, fullReviewTableName, checkName)) {
			await queryRunner.dropCheckConstraint(fullReviewTableName, checkName);
		}
		await runQuery(`
			UPDATE ${reviewTable}
			SET ${rejectionReason} = CASE
				WHEN ${rejectionReason} IN ('wrong_answer', 'wrong_tool_calling', 'other') THEN ${rejectionReason}
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
