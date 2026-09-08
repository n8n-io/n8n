# Kanban ordering decisions

This implementation is experimental. It stores one order value on each Data Table row.
The Kanban view filters rows into lanes and applies the same total order in each lane.

## Inline, table-global rank

The `_n8nKanbanOrder` column lives in each dynamic Data Table row table. This keeps lane
queries simple and avoids a separate sparse table with joins and manual orphan cleanup.

This choice adds one value and one index entry to every row, including rows in tables that
do not use Kanban.

## Fractional rank

The rank is a fixed-width 128-bit hexadecimal string. A card moved between two cards gets
the midpoint between their ranks.

The current allocator also uses a midpoint at the top and bottom boundaries. Repeated
inserts at one boundary consume the available gap exponentially. Approximately 128
sequential inserts can force a rebalance. A fixed boundary stride would delay rebalancing.

## Concurrent moves

The row ID is the final sort key. It gives a deterministic result when two cards have the
same rank.

Rank allocation is not serialized. Two mains can assign the same midpoint to concurrent
moves. Both requests can succeed, and the row ID then decides their order. A merge-ready
implementation must lock rank allocation or reject stale ordering revisions.

## Ordinary enum updates

An ordinary row update that changes the active grouping value moves the row to the top of
its new lane. This matches the selected product behavior for changes made outside Kanban.

The current path reads all affected rows, returns them from the update, and writes each
changed rank separately. Large bulk updates can therefore use substantial memory and issue
many writes. A set-based rank update is required before this behavior is suitable at scale.

## Rebalancing

Rebalancing preserves the current `(rank DESC, id DESC)` order and redistributes ranks
across the available range.

The current implementation sends one update for each row. Large lanes can hold a
transaction open and produce many database round trips. Replace this with batched `CASE`
updates or database-specific set-based updates.

## Test coverage

No Kanban-specific tests were added because this branch is an experiment. Existing tests
were updated only when the schema or constructor contract changed.

This constraint is not suitable for a merge-ready change. Ordering, cursor invalidation,
restore, migration, concurrent moves, and both supported databases need dedicated coverage.
