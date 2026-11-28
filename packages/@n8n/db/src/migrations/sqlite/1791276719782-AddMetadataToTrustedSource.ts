import { AddMetadataToTrustedSource1791276719782 as BaseMigration } from '../common/1791276719782-AddMetadataToTrustedSource';

/**
 * Adding and dropping the columns recreates `trusted_source` on SQLite. `trusted_source_identity`
 * references it with ON DELETE CASCADE, so the recreate's DROP would wipe the bindings. TypeORM
 * turns foreign keys off before the `up` transaction opens, and on rollback it issues that pragma
 * before the transaction only when `withFKsDisabled` is set. This flag keeps the drop local on
 * both paths.
 */
export class AddMetadataToTrustedSource1791276719782 extends BaseMigration {
	withFKsDisabled = true as const;
}
