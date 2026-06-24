# Delete using Query Builder

-   [Delete using Query Builder](#delete-using-query-builder)
    -   [`Delete`](#delete)
    -   [`Soft-Delete`](#soft-delete)
    -   [`Restore-Soft-Delete`](#restore-soft-delete)

### `Delete`

You can create `DELETE` queries using `QueryBuilder`.
Examples:

```typescript
await myDataSource
    .createQueryBuilder()
    .delete()
    .from(User)
    .where("id = :id", { id: 1 })
    .execute()
```

This is the most efficient way in terms of performance to delete entities from your database.

### `Soft-Delete`

Applying Soft Delete to QueryBuilder

```typescript
await dataSource.getRepository(Entity).createQueryBuilder().softDelete()
```

Examples:

```typescript
await myDataSource
  .getRepository(User)
  .createQueryBuilder()
  .softDelete()
  .where("id = :id", { id: 1 })
  .execute();
```

### `Restore-Soft-Delete`

Alternatively, You can recover the soft deleted rows by using the `restore()` method:

```typescript
await dataSource.getRepository(Entity).createQueryBuilder().restore()
```

Examples:

```typescript
await myDataSource
  .getRepository(User)
  .createQueryBuilder()
  .restore()
  .where("id = :id", { id: 1 })
  .execute();
```
