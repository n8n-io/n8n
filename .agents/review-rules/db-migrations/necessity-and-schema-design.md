# Necessity and schema design

Applies to: `packages/@n8n/db/src/migrations/**`.

## Should it exist?

Flag:

- a column or table that duplicates one that exists;
- state that application code or a read-time value could hold instead;
- a backfill that lazy computation would avoid, or a denormalised copy with no
  read pattern that needs it;
- a drop before expand-contract is complete;
- two unrelated changes in one file;
- an edit to an already-merged migration. Add a new one instead.

## Is the shape right?

Use the narrowest type that fits the value:

- a numeric type for numbers and byte counts, never `varchar`;
- native `uuid`, not `varchar(36)`;
- `timestampTimezone()` or `timestampNoTimezone()`. Plain `.timestamp()` is
  deprecated;
- `json` for structured data, `text` for unbounded user strings;
- never `double` for a version field.

Also flag:

- a reference column with no foreign key, a foreign key with no `onDelete`, or
  `ON DELETE SET NULL` on a `NOT NULL` column;
- a missing primary key, or one unlike the adjacent tables;
- a default that is wrong for existing rows;
- an enum-like string with no CHECK constraint;
- a standalone index on a boolean, or one that repeats a unique constraint. A
  partial index with a `WHERE` clause is correct. Do not flag it;
- an ID type that does not match the column it joins to.

Read the entity in `packages/@n8n/db/src/entities/`. Its type, nullability,
default, `@Index` and FK must agree with the migration. If you cannot read it, say
parity is unverified rather than guess.
