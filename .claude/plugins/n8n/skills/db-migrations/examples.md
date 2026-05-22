# Migration templates

Six copy-pasteable shapes covering ~95% of new migrations. Each is sourced
from a real merged migration in the repo. **Do not** copy timestamps —
generate fresh ones with `Date.now()` at author time.

---

## 1. Create a new table

Use case: introducing a new entity. Reference: `packages/@n8n/db/src/migrations/common/1776150756000-CreateFavoritesTable.ts`.

```ts
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateUserFavoritesTable1700000000000 implements ReversibleMigration {
  async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
    await createTable('user_favorites')
      .withColumns(
        column('id').int.primary.autoGenerate2.notNull,
        column('userId').uuid.notNull,
        column('resourceId').varchar(255).notNull,
        column('resourceType').varchar(64).notNull,
      )
      .withForeignKey('userId', {
        tableName: 'user',
        columnName: 'id',
        onDelete: 'CASCADE',
      })
      .withIndexOn('userId')
      .withIndexOn(['resourceType', 'resourceId'])
      .withUniqueConstraintOn(['userId', 'resourceId', 'resourceType']);
  }

  async down({ schemaBuilder: { dropTable } }: MigrationContext) {
    await dropTable('user_favorites');
  }
}
```

What this embodies:
- **Narrow types**: `int` PK with `autoGenerate2` (not UUID for an internal table); `uuid` for the FK to `user.id`; `varchar(64)` for a bounded enum-ish column.
- **Composite unique = composite index**: no separate `withIndexOn(['userId', 'resourceId', 'resourceType'])` needed.
- **Deliberate ON DELETE**: `CASCADE` — favorites die with the user.
- The single `withIndexOn('userId')` exists because lookups by user are a real query pattern.
- Add a matching entity with `@Entity({ name: 'user_favorites' })`, `@Index` mirroring each `withIndexOn`, FK relations as `Relation<UserEntity>`, extending `WithTimestampsAndStringId` if appropriate.

If the table needs created/updated timestamps, append `.withTimestamps;` after the constraints. (Don't roll your own datetime columns.)

---

## 2. Add a column with a partial unique index

Use case: adding an optional, unique-when-set column.

```ts
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddExternalRefToMyTable1700000000000 implements ReversibleMigration {
  async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
    await addColumns('my_table', [column('externalRef').varchar(255)]);

    await createIndex(
      'my_table',
      ['externalRef'],
      /*isUnique=*/ true,
      /*customIndexName=*/ undefined,
      /*whereClause=*/ '"externalRef" IS NOT NULL',
    );
  }

  async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
    await dropIndex('my_table', ['externalRef']);
    await dropColumns('my_table', ['externalRef']);
  }
}
```

What this embodies:
- **Partial unique index** excluding NULL rows — sparse-unique pattern. Smaller index and no uniqueness checks against the NULL bucket.
- The double-quotes in the `whereClause` are Postgres identifier quoting — the DSL preserves them for SQLite too.
- `down()` drops index then column in reverse order.
- Update the entity: nullable `externalRef: string | null;` plus `@Index(['externalRef'], { unique: true, where: '"externalRef" IS NOT NULL' })`.

---

## 3. Backfill data with a single SQL statement

Use case: populate a new column from existing data. Reference: `packages/@n8n/db/src/migrations/common/1771500000000-MigrateExternalSecretsToEntityStorage.ts`.

```ts
import type { IrreversibleMigration, MigrationContext } from '../migration-types';

interface ExternalSecretsSettings {
  [providerName: string]: { connected: boolean; settings: Record<string, unknown> };
}

const SETTINGS_KEY = 'feature.externalSecrets';

export class MigrateExternalSecretsToEntityStorage1700000000000 implements IrreversibleMigration {
  async up(context: MigrationContext) {
    const settings = await this.readSettings(context);
    if (!settings) return;

    for (const [providerName, providerData] of Object.entries(settings)) {
      if (!providerData.connected) {
        context.logger.info(
          `[${context.migrationName}] Provider "${providerName}" not connected, skipping`,
        );
        continue;
      }
      await this.insertProvider(context, providerName, providerData.settings);
    }
  }

  private async readSettings({
    escape,
    runQuery,
    logger,
    migrationName,
  }: MigrationContext): Promise<ExternalSecretsSettings | undefined> {
    const settingsTable = escape.tableName('settings');
    const keyCol = escape.columnName('key');
    const valueCol = escape.columnName('value');

    const rows: Array<{ value: string }> = await runQuery(
      `SELECT ${valueCol} FROM ${settingsTable} WHERE ${keyCol} = :key;`,
      { key: SETTINGS_KEY },
    );

    if (rows.length === 0) {
      logger.info(`[${migrationName}] No settings row, skipping`);
      return undefined;
    }
    return JSON.parse(rows[0].value);
  }

  private async insertProvider(
    { escape, runQuery, logger, migrationName }: MigrationContext,
    providerName: string,
    providerSettings: Record<string, unknown>,
  ) {
    const table = escape.tableName('secrets_provider_connection');
    const keyCol = escape.columnName('providerKey');
    const settingsCol = escape.columnName('settings');

    const existing: Array<{ providerKey: string }> = await runQuery(
      `SELECT ${keyCol} FROM ${table} WHERE ${keyCol} = :providerKey;`,
      { providerKey: providerName },
    );
    if (existing.length > 0) {
      logger.info(`[${migrationName}] Provider "${providerName}" already migrated, skipping`);
      return;
    }

    await runQuery(
      `INSERT INTO ${table} (${keyCol}, ${settingsCol}) VALUES (:providerKey, :settings);`,
      { providerKey: providerName, settings: JSON.stringify(providerSettings) },
    );
    logger.info(`[${migrationName}] Migrated provider "${providerName}"`);
  }
}
```

What this embodies:
- **Types defined locally**, not imported from app code — the migration must produce the same shape long after app code has drifted.
- **`escape.tableName` / `escape.columnName`** for every identifier — handles `tablePrefix` and quoting consistently.
- **Named parameters** in `runQuery` (`:key`) — never string interpolation for values.
- **Logger context**: `[${migrationName}]` prefix on every log line.
- **`IrreversibleMigration`** because the original encrypted blob is left in place but the new entity rows can't be reduced back (information loss on revert).
- **Idempotent**: re-running the migration after partial completion skips already-migrated providers.

If the backfill is one statement, prefer it:

```ts
await runQuery(`
  INSERT INTO ${escape.tableName('execution_meta')} ("executionId", "version")
  SELECT "id", :version FROM ${escape.tableName('execution_entity')}
  WHERE "version" IS NULL;
`, { version: 1 });
```

For very large datasets where SQL won't fit, use `runInBatches`:

```ts
await runInBatches<{ id: string; data: string }>(
  `SELECT "id", "data" FROM ${escape.tableName('credentials_entity')} WHERE "type" = :type`,
  async (batch) => {
    for (const row of batch) {
      // transform & write
    }
  },
  // optional batch size; default 100
);
```

---

## 4. Change a foreign key constraint

Use case: change `ON DELETE` behavior. Reference: `packages/@n8n/db/src/migrations/common/1775740765000-ChangeWorkflowPublishHistoryVersionIdToSetNull.ts`.

```ts
import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publish_history';
const columnName = 'versionId';
const reference: [string, string] = ['workflow_history', 'versionId'];

export class ChangeWorkflowPublishHistoryVersionIdToSetNull1700000000000
  implements ReversibleMigration
{
  async up({ schemaBuilder: { dropForeignKey, addForeignKey, dropNotNull } }: MigrationContext) {
    await dropForeignKey(tableName, columnName, reference);
    await dropNotNull(tableName, columnName);
    await addForeignKey(tableName, columnName, reference, undefined, 'SET NULL');
  }

  async down(mc: MigrationContext) {
    const {
      schemaBuilder: { dropForeignKey, addForeignKey, addNotNull },
    } = mc;

    await dropForeignKey(tableName, columnName, reference);
    await mc.runQuery(`DELETE FROM ${tableName} WHERE ${columnName} IS NULL`);
    await addNotNull(tableName, columnName);
    await addForeignKey(tableName, columnName, reference, undefined, 'CASCADE');
  }
}
```

What this embodies:
- **Drop FK first, then change column**, then re-add FK with the new behavior.
- **`down()` cleans up rows that are invalid in the previous schema** (the new `NULL` rows can't exist when the column is `NOT NULL`).
- **Reference tuple**: `[tableName, columnName]` — the DSL handles the constraint name.
- Update the entity's relation to match: `@JoinColumn`, `nullable: true`, `onDelete: 'SET NULL'` — entity-vs-migration drift is the most common reviewer flag.

---

## 5. SQLite-specific override (`withFKsDisabled`)

Use case: a `common/` migration that recreates a FK-referenced table — SQLite's "drop and recreate" path will CASCADE-delete dependent rows unless FKs are off. Reference: `packages/@n8n/db/src/migrations/sqlite/1693491613982-ExecutionSoftDelete.ts`.

```ts
// packages/@n8n/db/src/migrations/sqlite/1700000000000-ExampleRecreateTable.ts
import { ExampleRecreateTable1700000000000 as BaseMigration } from '../common/1700000000000-ExampleRecreateTable';

export class ExampleRecreateTable1700000000000 extends BaseMigration {
  withFKsDisabled = true as const;
}
```

What this embodies:
- **Subclass the common migration** with the same class name and timestamp.
- **`withFKsDisabled = true as const`** turns off `PRAGMA foreign_keys` for the migration. The wrapper also flips `transaction = false` automatically.
- Register **only the SQLite override** in `sqlite/index.ts`; register the common version in `postgresdb/index.ts`.
- Name FK constraints explicitly in the common migration so down/up cycles don't accumulate duplicates on SQLite.

---

## 6. Migration test

Use case: integration test for any new migration. Reference: `packages/cli/test/migration/1770000000000-create-chat-hub-tools-table.test.ts`.

```ts
// packages/cli/test/migration/1700000000000-add-external-ref-to-my-table.test.ts
import {
  createTestMigrationContext,
  initDbUpToMigration,
  runSingleMigration,
  type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddExternalRefToMyTable1700000000000';

describe(`${MIGRATION_NAME} Migration`, () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    const dbConnection = Container.get(DbConnection);
    await dbConnection.init();

    dataSource = Container.get(DataSource);

    const context = createTestMigrationContext(dataSource);
    await context.queryRunner.clearDatabase();
    await context.queryRunner.release();

    await initDbUpToMigration(MIGRATION_NAME);
  });

  afterAll(async () => {
    const dbConnection = Container.get(DbConnection);
    await dbConnection.close();
  });

  async function insertRow(context: TestMigrationContext): Promise<string> {
    const id = randomUUID();
    const tableName = context.escape.tableName('my_table');
    await context.runQuery(
      `INSERT INTO ${tableName} ("id", "name") VALUES (:id, :name)`,
      { id, name: `row-${id}` },
    );
    return id;
  }

  describe('Up Migration', () => {
    beforeAll(async () => {
      await runSingleMigration(MIGRATION_NAME);
    });

    it('adds the externalRef column', async () => {
      const context = createTestMigrationContext(dataSource);
      const tableName = context.escape.tableName('my_table');

      const id = await insertRow(context);
      await context.runQuery(
        `UPDATE ${tableName} SET "externalRef" = :ref WHERE "id" = :id`,
        { ref: 'ext-123', id },
      );

      const rows = await context.runQuery<Array<{ externalRef: string | null }>>(
        `SELECT "externalRef" FROM ${tableName} WHERE "id" = :id`,
        { id },
      );
      expect(rows[0].externalRef).toBe('ext-123');

      await context.queryRunner.release();
    });

    it('rejects duplicate non-null externalRef', async () => {
      const context = createTestMigrationContext(dataSource);
      const tableName = context.escape.tableName('my_table');

      const id1 = await insertRow(context);
      const id2 = await insertRow(context);
      const dupRef = 'ext-dup';

      await context.runQuery(
        `UPDATE ${tableName} SET "externalRef" = :ref WHERE "id" = :id`,
        { ref: dupRef, id: id1 },
      );
      await expect(
        context.runQuery(
          `UPDATE ${tableName} SET "externalRef" = :ref WHERE "id" = :id`,
          { ref: dupRef, id: id2 },
        ),
      ).rejects.toThrow();

      await context.queryRunner.release();
    });

    it('allows multiple NULL externalRef rows', async () => {
      const context = createTestMigrationContext(dataSource);
      // Two rows with default NULL ref — should not violate the partial unique index
      await insertRow(context);
      await insertRow(context);
      await context.queryRunner.release();
    });
  });
});
```

What this embodies:
- **`initDbUpToMigration` runs every migration BEFORE the target**, leaving the DB at the previous schema.
- **Fixtures inserted via raw SQL** (`escape.tableName`, named params) — never via TypeORM repositories, since they evolve with the schema and break older tests over time.
- **`runSingleMigration` runs only the target migration**, so the test's `it(...)` blocks observe the post-migration state.
- **Both DB engines covered automatically** by the test runner; branch on `context.isPostgres` / `context.isSqlite` only when the assertion mechanics differ (e.g. checking column existence via `PRAGMA` vs `information_schema`).
- **Edge cases tested**: NULL handling, duplicates, invalid rows. The data-migration version of this test should also cover rows already in target shape.
- **Always release the queryRunner** between assertions to avoid connection-pool leaks.

Run the test:

```bash
pushd packages/cli && pnpm test test/migration/1700000000000-add-external-ref-to-my-table.test.ts && popd
```

The runner is configured to execute against both SQLite (default) and Postgres in CI.
