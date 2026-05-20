import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AGENT_REVIEW_REJECTION_REASONS = [
	'incorrect_answer',
	'incomplete_answer',
	'wrong_tool',
	'missing_tool',
	'hallucination',
	'bad_format',
	'unsafe_behavior',
	'other',
];

export class AddRejectionReasonToAgentEvaluationCase1784000000010 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('agent_evaluation_case', [
			column('rejectionReason').varchar(32).withEnumCheck(AGENT_REVIEW_REJECTION_REASONS),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_evaluation_case', ['rejectionReason']);
	}
}
