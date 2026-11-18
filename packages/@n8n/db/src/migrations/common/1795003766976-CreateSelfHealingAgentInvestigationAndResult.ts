import type { MigrationContext, ReversibleMigration } from '../migration-types';

const RESULT_TABLE = 'self_healing_agent_result';
const INVESTIGATION_TABLE = 'self_healing_agent_investigation';

const TRIGGERS = ['schedule', 'traces', 'both', 'manual'];

const cascade = (tableName: string) => ({
	tableName,
	columnName: 'id',
	onDelete: 'CASCADE' as const,
});

export class CreateSelfHealingAgentInvestigationAndResult1795003766976
	implements ReversibleMigration
{
	async up({ schemaBuilder: { createTable, column, createIndex }, escape }: MigrationContext) {
		// The investigation references the result, so the result table comes first.
		// String IDs match the workflow self-healing tables and the Inbox item IDs.
		await createTable(RESULT_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('configurationId').int.notNull,
				column('projectId').varchar(36).notNull.comment('Project of the agent'),
				column('agentId').varchar(36).notNull.comment('Investigated agent'),
				column('agentName').varchar(255).notNull.comment('Agent name when the proposal was saved'),
				column('backgroundUserId').uuid.notNull.comment('User who enabled the investigation'),
				column('baseVersionId')
					.varchar(36)
					.notNull.comment('Published agent version that the investigation read and tested'),
				column('goals').json.notNull.comment(
					'What the investigation tried to improve; quality first, then optional cost and latency',
				),
				column('trigger')
					.varchar(16)
					.notNull.withEnumCheck(TRIGGERS)
					.comment('What started the investigation; both means schedule and trace count'),
				column('traceWindowStart')
					.timestampTimezone()
					.comment('Exclusive start of the production trace window; null means no lower limit'),
				column('traceWindowEnd')
					.timestampTimezone()
					.notNull.comment('Inclusive end of the production trace window'),
				column('traceCount')
					.int.notNull.default(0)
					.comment('Production traces in the window at admission'),
				column('summary').varchar(255).notNull.comment('Short title, at most 80 characters'),
				column('report').text.notNull.comment('Saved Markdown report'),
				column('edits').json.notNull.comment('Tested agent edits with before and after values'),
				column('evalCases').json.notNull.comment('Eval cases that the proposal adds or updates'),
				column('evidence').json.comment(
					'Stored test results of the published and the proposed version',
				),
				column('usage').json.notNull.comment(
					'Recorded runtime and accounting usage; null measurements mean unknown',
				),
				column('reviewState')
					.varchar(16)
					.notNull.default("'open'")
					.withEnumCheck(['open', 'applied', 'outdated', 'dismissed'])
					.comment('Review decision; open proposals wait in the Inbox'),
				column('appliedAutomatically')
					.bool.notNull.default(false)
					.comment('True when the publish-everything mode applied the proposal'),
				column('publishedVersionId').varchar(36).comment('Agent version that the apply published'),
				column('applyProgress').json.notNull.comment(
					'Parts of the proposal that are applied; a retry does the remaining parts',
				),
				column('applyError').text.comment('Why the last apply did not finish'),
				column('applyStartedAt').timestampTimezone().comment('Claim of an apply in progress'),
				column('closedAt').timestampTimezone(),
				column('closedById').uuid.comment('Reviewer who closed the proposal'),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn(['projectId', 'reviewState'])
			.withIndexOn(['agentId', 'reviewState'])
			.withIndexOn(['configurationId', 'updatedAt'])
			.withIndexOn('backgroundUserId')
			.withIndexOn('closedById')
			.withForeignKey('configurationId', cascade('self_healing_configuration'))
			.withForeignKey('projectId', cascade('project'))
			.withForeignKey('agentId', cascade('agents'))
			.withForeignKey('backgroundUserId', cascade('user'))
			.withForeignKey('closedById', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });

		await createTable(INVESTIGATION_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('configurationId').int.notNull,
				column('projectId').varchar(36).notNull.comment('Project of the agent'),
				column('agentId').varchar(36).notNull.comment('Investigated agent'),
				column('backgroundUserId').uuid.notNull.comment('User who enabled the investigation'),
				column('trigger')
					.varchar(16)
					.notNull.withEnumCheck(TRIGGERS)
					.comment('What started the investigation; both means schedule and trace count'),
				column('agentVersionId')
					.varchar(36)
					.notNull.comment('Published agent version at admission'),
				column('traceWindowStart')
					.timestampTimezone()
					.comment('Exclusive start of the production trace window; null means no lower limit'),
				column('traceWindowEnd')
					.timestampTimezone()
					.notNull.comment('Inclusive end of the production trace window'),
				column('traceCount')
					.int.notNull.default(0)
					.comment('Production traces in the window at admission'),
				column('threadId').uuid.notNull.comment(
					'Private Assistant thread ID; retained after deletion',
				),
				column('runId').uuid.notNull.comment(
					'Assistant run ID; technical status stays in run events',
				),
				column('outcome')
					.varchar(16)
					.withEnumCheck(['proposal', 'no_change', 'failed'])
					.comment('Null while the investigation runs'),
				column('failureReason').varchar(64).comment('Internal reason code of a failed outcome'),
				column('usage').json.comment('Cost of the investigation; null until it finishes'),
				column('resultId').varchar(36).comment('Proposal saved by the investigation'),
				column('finishedAt')
					.timestampTimezone()
					.comment('When the investigation released its agent claim'),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn(['agentId', 'createdAt'])
			.withIndexOn(['configurationId', 'createdAt'])
			.withIndexOn('projectId')
			.withIndexOn('backgroundUserId')
			.withIndexOn('resultId')
			.withForeignKey('configurationId', cascade('self_healing_configuration'))
			.withForeignKey('projectId', cascade('project'))
			.withForeignKey('agentId', cascade('agents'))
			.withForeignKey('backgroundUserId', cascade('user'))
			.withForeignKey('resultId', {
				tableName: RESULT_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			});
		// One unfinished investigation for each agent: this index is the claim.
		await createIndex(
			INVESTIGATION_TABLE,
			['agentId'],
			true,
			undefined,
			`${escape.columnName('finishedAt')} IS NULL`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(INVESTIGATION_TABLE);
		await dropTable(RESULT_TABLE);
	}
}
