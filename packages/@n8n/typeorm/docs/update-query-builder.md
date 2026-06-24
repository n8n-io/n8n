# Update using Query Builder

You can create `UPDATE` queries using `QueryBuilder`.
Examples:

```typescript
await dataSource
    .createQueryBuilder()
    .update(User)
    .set({ firstName: "Timber", lastName: "Saw" })
    .where("id = :id", { id: 1 })
    .execute()
```

This is the most efficient way in terms of performance to update entities in your database.

### Raw SQL support

In some cases when you need to execute SQL queries you need to use function style value:

```typescript
await dataSource
    .createQueryBuilder()
    .update(User)
    .set({
        firstName: "Timber",
        lastName: "Saw",
        age: () => "age + 1",
    })
    .where("id = :id", { id: 1 })
    .execute()
```

This syntax doesn't escape your values, you need to handle escape on your own.
