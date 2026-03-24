# AGENTS.md

Extra information specific to the `@n8n/db` package.

## Creating Migrations

### Step-by-step workflow

1. **Generate a timestamp** for the migration filename:
   ```bash
   date +%s000
   ```
   This gives a Unix timestamp in milliseconds (e.g. `1750252139167`).

2. **Decide where the migration goes:**
   - `migrations/common/` — if the migration uses only the DSL or
     DB-agnostic raw SQL (most migrations go here)
   - `migrations/sqlite/` and `migrations/postgresdb/` — only if
     the migration requires dialect-specific SQL that the DSL cannot abstract

3. **Create the migration file:**
   - Filename: `{timestamp}-{DescriptiveName}.ts`
     (e.g. `1750252139167-AddRolesTables.ts`)
   - Class name: `{DescriptiveName}{timestamp}`
     (e.g. `AddRolesTables1750252139167`)

4. **Register the migration** in the appropriate index file(s):
   - Common migrations: add to **both** `migrations/sqlite/index.ts`
     and `migrations/postgresdb/index.ts`
   - DB-specific migrations: add to only the relevant index file
   - Append to the end of the imports and the exports array

5. **Write a migration test** (see [Testing Migrations](#testing-migrations))

6. **Run the test** to validate:
   ```bash
   pushd packages/cli && pnpm test <test-file> && popd
   ```

### Migration structure

Implement either `ReversibleMigration` (preferred) or
`IrreversibleMigration`:

```typescript
import type { MigrationContext, ReversibleMigration } from '@n8n/db';

export class AddStatusColumn1750252139167 implements ReversibleMigration {
  async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
    await addColumns('workflow_entity', [
      column('status').varchar(20).notNull.default("'active'"),
    ]);
    await createIndex('workflow_entity', ['status']);
  }

  async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
    await dropIndex('workflow_entity', ['status']);
    await dropColumns('workflow_entity', ['status']);
  }
}
```

Use `IrreversibleMigration` only when `down()` would cause data loss
(e.g. encrypting/transforming data).

### For common migrations referenced from DB-specific index files

When a migration lives in `common/`, each DB-specific index re-exports it
with its own timestamp. Create a thin wrapper in `sqlite/` and/or
`postgresdb/`:

```typescript
// migrations/sqlite/1750252139167-AddStatusColumn.ts
import { AddStatusColumn1750252139167 } from '../common/1750252139167-AddStatusColumn';
export { AddStatusColumn1750252139167 };
```

Or if the timestamps differ between sqlite and postgres index entries, use
class extension:

```typescript
// migrations/postgresdb/1750252139170-AddStatusColumn.ts
import { AddStatusColumn1750252139167 } from '../common/1750252139167-AddStatusColumn';
export class AddStatusColumn1750252139170 extends AddStatusColumn1750252139167 {}
```

## Migration DSL

### Prefer DSL over raw SQL

The DSL in `migrations/dsl/` handles cross-DB type mapping automatically.
Use it for all standard operations:

```typescript
// Access via destructuring MigrationContext
async up({ schemaBuilder: { createTable, column, createIndex, addColumns, dropColumns } }: MigrationContext) {
```

### Column types

| DSL                      | SQLite      | PostgreSQL              |
|--------------------------|-------------|-------------------------|
| `column('x').int`        | `integer`   | `int`                   |
| `column('x').bigint`     | `bigint`    | `bigint`                |
| `column('x').bool`       | `boolean`   | `boolean`               |
| `column('x').varchar(N)` | `varchar(N)`| `character varying(N)`  |
| `column('x').text`       | `text`      | `text`                  |
| `column('x').json`       | `text`      | `json`                  |
| `column('x').uuid`       | `varchar`   | `uuid`                  |
| `column('x').binary`     | `blob`      | `bytea`                 |
| `column('x').timestampTimezone()` | `datetime` | `timestamptz` |

### Column modifiers

```typescript
column('id').int.primary.autoGenerate2    // Auto-increment PK (integers only)
column('name').varchar(255).notNull
column('description').text.default(null)
column('status').text.notNull.default("'active'")  // String defaults need inner quotes
column('role').text.withEnumCheck(['admin', 'member', 'viewer'])
column('notes').text.comment('Internal notes')
```

### Table operations

```typescript
// Create table with timestamps, index, and FK
await createTable('my_table')
  .withColumns(
    column('id').int.primary.autoGenerate2,
    column('workflowId').varchar(36).notNull,
    column('data').json,
  )
  .withTimestamps                        // Adds createdAt + updatedAt
  .withIndexOn('workflowId')
  .withForeignKey('workflowId', {
    tableName: 'workflow_entity',
    columnName: 'id',
    onDelete: 'CASCADE',
  });

// Drop table
await dropTable('my_table');

// Add/drop columns
await addColumns('user', [column('bio').text.default(null)]);
await dropColumns('user', ['bio']);

// Add/drop indexes
await createIndex('user', ['email'], true);   // unique index
await dropIndex('user', ['email']);

// Add/drop foreign keys
await addForeignKey('execution', 'workflowId', ['workflow_entity', 'id']);
await dropForeignKey('execution', 'workflowId', ['workflow_entity', 'id']);

// Nullable changes
await addNotNull('user', 'email');
await dropNotNull('user', 'description');
```

### UUID Primary Keys

Do **not** use `autoGenerate` or `autoGenerate2` on UUID columns. Both cause
TypeORM to emit `DEFAULT uuid_generate_v4()` in PostgreSQL, which requires the
`uuid-ossp` extension in the `public` schema. This fails on managed Postgres
services like Supabase where the extension lives in a different schema.

**Instead**, generate UUIDs at the application level:

Migration:
```typescript
column('id').uuid.primary.notNull,
```

Entity:
```typescript
import { randomUUID } from 'node:crypto';
import { BeforeInsert, PrimaryColumn } from '@n8n/typeorm';

@PrimaryColumn('uuid')
id: string;

@BeforeInsert()
generateId() {
  if (!this.id) {
    this.id = randomUUID();
  }
}
```

`autoGenerate` / `autoGenerate2` are fine for **integer** columns (they use
`serial` / `GENERATED BY DEFAULT AS IDENTITY` respectively).

### When raw SQL is needed

Use raw SQL only for operations the DSL does not support:
- Composite primary keys
- Composite foreign keys
- Complex data transformations
- DB-specific syntax (put in `sqlite/` or `postgresdb/`)

Always use escaping helpers and named parameters:

```typescript
async up({ escape, runQuery, tablePrefix }: MigrationContext) {
  const table = escape.tableName('my_table');
  const col = escape.columnName('status');

  // Named parameters — never interpolate user data
  await runQuery(
    `UPDATE ${table} SET ${col} = :newStatus WHERE ${col} = :oldStatus`,
    { newStatus: 'active', oldStatus: 'enabled' },
  );
}
```

### Batch operations

For large data migrations, use `runInBatches()` or `copyTable()`:

```typescript
await ctx.runInBatches<{ id: string }>(
  `SELECT id FROM ${table} WHERE status IS NULL`,
  async (rows) => {
    for (const { id } of rows) {
      await ctx.runQuery(`UPDATE ${table} SET status = 'active' WHERE id = :id`, { id });
    }
  },
  500, // batch size
);
```

## Testing Migrations

Migration tests live in `packages/cli/test/migration/` and use helpers from
`@n8n/backend-test-utils`.

### Test template

```typescript
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import {
  createTestMigrationContext,
  initDbUpToMigration,
  runSingleMigration,
  undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';

describe('AddStatusColumn1750252139167 Migration', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    const dbConnection = Container.get(DbConnection);
    await dbConnection.init();
    dataSource = Container.get(DataSource);
    const ctx = createTestMigrationContext(dataSource);
    await ctx.queryRunner.clearDatabase();
    await initDbUpToMigration('AddStatusColumn1750252139167');
  });

  describe('up', () => {
    it('should add status column with default value', async () => {
      // Insert test data in OLD schema (before migration)
      // Use raw SQL, NOT repositories (entities change over time)
      const ctx = createTestMigrationContext(dataSource);
      await ctx.runQuery(
        `INSERT INTO ${ctx.escape.tableName('workflow_entity')} (id, name)
         VALUES (:id, :name)`,
        { id: '1', name: 'test' },
      );
      await ctx.queryRunner.release();

      // Run the migration
      await runSingleMigration('AddStatusColumn1750252139167');
      dataSource = Container.get(DataSource);

      // Verify the result
      const postCtx = createTestMigrationContext(dataSource);
      const rows = await postCtx.runQuery(
        `SELECT status FROM ${postCtx.escape.tableName('workflow_entity')} WHERE id = :id`,
        { id: '1' },
      );
      expect(rows[0].status).toBe('active');
      await postCtx.queryRunner.release();
    });
  });

  describe('down', () => {
    it('should remove status column', async () => {
      await runSingleMigration('AddStatusColumn1750252139167');
      await undoLastSingleMigration();
      dataSource = Container.get(DataSource);

      const ctx = createTestMigrationContext(dataSource);
      const columns = await ctx.runQuery(
        `PRAGMA table_info(${ctx.escape.tableName('workflow_entity')})`,
      );
      expect(columns.find((c: any) => c.name === 'status')).toBeUndefined();
      await ctx.queryRunner.release();
    });
  });
});
```

### Test rules

- **Always use raw SQL** for inserting test data — never use TypeORM
  repositories (entity shapes change over time, breaking old migration tests)
- **Use named parameters** (`:paramName`) in queries, never string
  interpolation
- **Test both `up` and `down`** for reversible migrations
- **Get a fresh `DataSource`** from the container after running each
  migration step (`Container.get(DataSource)`)
- **Release query runners** after use (`ctx.queryRunner.release()`)

### Running migration tests

```bash
pushd packages/cli && pnpm test test/migration/<test-file>.test.ts && popd
```

## Checklist

Before considering a migration complete, verify:

- [ ] Migration file created with correct timestamp and naming
- [ ] Class implements `ReversibleMigration` or `IrreversibleMigration`
- [ ] Registered in `migrations/sqlite/index.ts` and/or
      `migrations/postgresdb/index.ts`
- [ ] Uses DSL where possible, raw SQL only when necessary
- [ ] `escape.tableName()` / `escape.columnName()` used for all identifiers
- [ ] Named parameters used (no string interpolation of values)
- [ ] `down()` method reverses all changes (for reversible migrations)
- [ ] Migration test written and passing
- [ ] No `autoGenerate`/`autoGenerate2` on UUID columns
