import { AddIsRuntimeToCredentials1795700000001 as BaseMigration } from '../common/1795700000001-AddIsRuntimeToCredentials';

// credentials_entity has incoming cascading foreign keys, so SQLite must not
// enforce them while it recreates the table.
export class AddIsRuntimeToCredentials1795700000001 extends BaseMigration {
	withFKsDisabled = true as const;
}
