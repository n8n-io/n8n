import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAuditLogEventTable1785900000001 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, column } = ctx.schemaBuilder;

		await createTable('audit_log_event')
			.withColumns(
				column('id').varchar(36).primary.comment('Originating EventMessage id'),
				column('eventName').varchar(255).notNull.comment('Dotted event name, e.g. n8n.audit.*'),
				column('message').varchar(255).notNull,
				column('ts').timestampTimezone().notNull.comment("The event's own timestamp"),
				column('payload').json,
			)
			.withIndexOn(['eventName']).withTimestamps;
	}

	async down(ctx: MigrationContext) {
		await ctx.schemaBuilder.dropTable('audit_log_event');
	}
}
