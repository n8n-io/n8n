# Data safety

Applies to: `packages/@n8n/db/src/migrations/**`.

Think of a database last upgraded two years ago. It holds dirty rows, unexpected
NULLs, retired enum values and malformed JSON.

Flag:

- a drop, or a new `NOT NULL`, in the same release that changes the column's
  writer. Old instances still write during a rolling deploy;
- rows deleted with no fallback copy;
- a table copy with no row-count check;
- a backfill that overwrites the old value with no way back, in a
  `ReversibleMigration`;
- a backfill that gives a row the less safe value when the old data does not
  show the correct value. For example, the column that decides the value is
  NULL, or has two possible meanings. The safe value gives less access, or
  keeps the old behaviour;
- `JSON.parse` with no `try`/`catch`;
- iteration with no `Array.isArray`, or a property read that assumes the property
  exists;
- a backfill that cannot be retried after a partial failure;
- a failed precondition that skips the work while the migration still completes;
- a loop that can retry forever;
- ordering that is assumed, not enforced;
- a `down()` that is empty, or that claims to restore data it does not restore.

`IrreversibleMigration` is correct only when `up()` destroys data that `down()`
would need, and the reason is stated. It blocks `db:revert` everywhere, so do not
ask for it when a `down()` drops data only the new schema holds, or clamps values
to the old type, and a comment says what is lost.

If a comment says no `n8n@` release has the table, deleting its rows or skipping
expand-contract is correct.

Do not flag a hazard the code handles. A guarded parse, a batched update or a
`withFKsDisabled` subclass is the fix.
