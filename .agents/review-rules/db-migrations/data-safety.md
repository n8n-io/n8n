# Data safety

Applies to: `packages/@n8n/db/src/migrations/**`.

Think of a database last upgraded two years ago. It holds dirty rows, unexpected
NULLs, retired enum values and malformed JSON.

Flag:

- a drop in the same release the code stopped writing the column. Expand-contract
  must finish first;
- rows deleted with no fallback copy;
- a table copy with no row-count check;
- a backfill that overwrites the old value with no way back, in a
  `ReversibleMigration`;
- `JSON.parse` with no `try`/`catch`;
- iteration with no `Array.isArray`, or a property read that assumes the property
  exists;
- a backfill that cannot be retried after a partial failure;
- ordering that is assumed, not enforced;
- a `down()` that is empty, or does not restore the previous state.

`IrreversibleMigration` is correct only when `up()` destroys data that `down()`
would need, and the reason is stated. It is not a way to skip a tedious `down()`.

Do not flag a hazard the code handles. A guarded parse, a batched update or a
`withFKsDisabled` subclass is the fix.
