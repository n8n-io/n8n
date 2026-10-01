import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'trusted_source';

/**
 * `metadata` holds the discovered OAuth2 documents as plain JSON. `discoveryClaimToken` names the
 * discovery run that holds the lease on the row, so two instances never refresh the same source at
 * once; `discoveryClaimedAt` only tells when that lease expires.
 */
export class AddMetadataToTrustedSource1790795921000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			table,
			[
				column('metadata').text,
				column('discoveryClaimedAt').timestampTimezone(3),
				column('discoveryClaimToken').varchar(36),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['metadata', 'discoveryClaimedAt', 'discoveryClaimToken'], {
			recreatesOnSqlite: true,
		});
	}
}
