import { AddKindAndMetadataToDataTable1788770612223 as BaseMigration } from '../common/1788770612223-AddKindAndMetadataToDataTable';

/**
 * Column changes recreate `data_table` on SQLite. `data_table_column` has an
 * ON DELETE CASCADE foreign key to it, so disable foreign keys during the migration.
 */
export class AddKindAndMetadataToDataTable1788770612223 extends BaseMigration {
	withFKsDisabled = true as const;
}
