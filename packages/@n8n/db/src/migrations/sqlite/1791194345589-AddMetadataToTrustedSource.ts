import { AddMetadataToTrustedSource1791194345589 as BaseMigration } from '../common/1791194345589-AddMetadataToTrustedSource';

/**
 * Adding and dropping the columns recreates `trusted_source` on SQLite. `trusted_source_identity`
 * references it with ON DELETE CASCADE, so the recreate's DROP would wipe the bindings. TypeORM
 * turns foreign keys off before the `up` transaction opens, but issues that pragma inside the
 * rollback transaction, where SQLite ignores it. This flag keeps the drop local on both paths.
 */
export class AddMetadataToTrustedSource1791194345589 extends BaseMigration {
	withFKsDisabled = true as const;
}
