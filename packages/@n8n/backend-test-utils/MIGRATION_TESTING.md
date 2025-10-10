# Migration Testing Helpers

This package provides utilities for testing database migrations by allowing you to stop before a specific migration, insert test data, and then run that migration.

## API

### `initDbUpToMigration(beforeMigrationName: string): Promise<void>`

Initializes the database and runs all migrations up to (but not including) the specified migration.

**Parameters:**
- `beforeMigrationName`: The class name of the migration to stop before (e.g., `'AddUserRole1234567890'`)

**Throws:**
- `UnexpectedError` if the migration is not found or database is not initialized

### `runSingleMigration(migrationName: string): Promise<void>`

Runs a single migration by name.

**Parameters:**
- `migrationName`: The class name of the migration to run (e.g., `'AddUserRole1234567890'`)

**Throws:**
- `UnexpectedError` if the migration is not found or database is not initialized

## Usage Example

```typescript
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { initDbUpToMigration, runSingleMigration } from '@n8n/backend-test-utils';

describe('AddUserRole1234567890 Migration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    // Initialize database but stop BEFORE the migration we want to test
    await initDbUpToMigration('AddUserRole1234567890');
    dataSource = Container.get(DataSource);
  });

  it('should add role column to users table', async () => {
    // Insert test data in the OLD schema (before migration)
    // You should not use Repositories, because these will break after schema changes
    // over time.
    await dataSource.query(`
      INSERT INTO users (id, email, password)
      VALUES (1, 'test@example.com', 'hashed_password')
    `);

    // Run the migration
    await runSingleMigration('AddUserRole1234567890');

    // Verify the migration worked correctly
    const users = await dataSource.query('SELECT * FROM users WHERE id = 1');
    expect(users[0].role).toBe('member'); // Default role was added
  });
});
```

## How It Works

1. **`initDbUpToMigration`**:
   - Gets all available migrations from TypeORM DataSource
   - Finds the target migration by name
   - Temporarily replaces the migrations array with only migrations before the target
   - Wraps and runs those migrations
   - Restores the full migrations array

2. **`runSingleMigration`**:
   - Finds the specific migration by name
   - Temporarily replaces the migrations array with only that migration
   - Wraps and runs that single migration
   - Restores the full migrations array

## Important Notes

- These functions must be used with an initialized database connection (after `dbConnection.init()`)
- Do NOT call `dbConnection.migrate()` before using these helpers - they replace that step
- Migration wrapping is idempotent - migrations won't be double-wrapped
- The full migrations array is always restored after operations complete (even on error)
