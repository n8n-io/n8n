import { AddIsRuntimeToCredentials1794995238085 as BaseMigration } from '../common/1794995238085-AddIsRuntimeToCredentials';

// credentials_entity has incoming cascading foreign keys, so SQLite must not
// enforce them while it recreates the table.
export class AddIsRuntimeToCredentials1794995238085 extends BaseMigration {
	withFKsDisabled = true as const;
}
