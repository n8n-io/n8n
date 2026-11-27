import { AddFirstAuthenticatedAtToTrustedSource1793354377949 as BaseMigration } from '../common/1793354377949-AddFirstAuthenticatedAtToTrustedSource';

/**
 * Adding and dropping the column recreates `trusted_source` on SQLite. `trusted_source_identity`
 * references it with ON DELETE CASCADE, so the recreate's DROP would wipe the bindings. TypeORM
 * turns foreign keys off before the `up` transaction opens, and on rollback it issues that pragma
 * before the transaction only when `withFKsDisabled` is set. This flag keeps the drop local on
 * both paths.
 */
export class AddFirstAuthenticatedAtToTrustedSource1793354377949 extends BaseMigration {
	withFKsDisabled = true as const;
}
