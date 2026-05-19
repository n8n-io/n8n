# `EntityManager` API

-   `dataSource` - The DataSource used by `EntityManager`.

```typescript
const dataSource = manager.dataSource
```

-   `queryRunner` - The query runner used by `EntityManager`.
    Used only in transactional instances of EntityManager.

```typescript
const queryRunner = manager.queryRunner
```

-   `transaction` - Provides a transaction where multiple database requests will be executed in a single database transaction.
    Learn more [Transactions](./transactions.md).

```typescript
await manager.transaction(async (manager) => {
    // NOTE: you must perform all database operations using the given manager instance
    // it's a special instance of EntityManager working with this transaction
    // and don't forget to await things here
})
```

-   `query` - Executes a raw SQL query.

```typescript
const rawData = await manager.query(`SELECT * FROM USERS`)
```

-   `createQueryBuilder` - Creates a query builder use to build SQL queries.
    Learn more about [QueryBuilder](select-query-builder.md).

```typescript
const users = await manager
    .createQueryBuilder()
    .select()
    .from(User, "user")
    .where("user.name = :name", { name: "John" })
    .getMany()
```

-   `hasId` - Checks if given entity has its primary column property defined.

```typescript
if (manager.hasId(user)) {
    // ... do something
}
```

-   `getId` - Gets given entity's primary column property value.
    If the entity has composite primary keys then the returned value will be an object with names and values of primary columns.

```typescript
const userId = manager.getId(user) // userId === 1
```

-   `create` - Creates a new instance of `User`. Optionally accepts an object literal with user properties
    which will be written into newly created user object.

```typescript
const user = manager.create(User) // same as const user = new User();
const user = manager.create(User, {
    id: 1,
    firstName: "Timber",
    lastName: "Saw",
}) // same as const user = new User(); user.firstName = "Timber"; user.lastName = "Saw";
```

-   `merge` - Merges multiple entities into a single entity.

```typescript
const user = new User()
manager.merge(User, user, { firstName: "Timber" }, { lastName: "Saw" }) // same as user.firstName = "Timber"; user.lastName = "Saw";
```

-   `preload` - Creates a new entity from the given plain javascript object. If the entity already exist in the database, then
    it loads it (and everything related to it), replaces all values with the new ones from the given object,
    and returns the new entity. The new entity is actually loaded from the database entity with all properties
    replaced from the new object.

```typescript
const partialUser = {
    id: 1,
    firstName: "Rizzrak",
    profile: {
        id: 1,
    },
}
const user = await manager.preload(User, partialUser)
// user will contain all missing data from partialUser with partialUser property values:
// { id: 1, firstName: "Rizzrak", lastName: "Saw", profile: { id: 1, ... } }
```

-   `save` - Saves a given entity or array of entities.
    If the entity already exists in the database, then it's updated.
    If the entity does not exist in the database yet, it's inserted.
    It saves all given entities in a single transaction (in the case of entity manager is not transactional).
    Also supports partial updating since all undefined properties are skipped. In order to make a value `NULL`, you must manually set the property to equal `null`.

```typescript
await manager.save(user)
await manager.save([category1, category2, category3])
```

-   `remove` - Removes a given entity or array of entities.
    It removes all given entities in a single transaction (in the case of entity, manager is not transactional).

```typescript
await manager.remove(user)
await manager.remove([category1, category2, category3])
```

-   `insert` - Inserts a new entity, or array of entities.

```typescript
await manager.insert(User, {
    firstName: "Timber",
    lastName: "Timber",
})

await manager.insert(User, [
    {
        firstName: "Foo",
        lastName: "Bar",
    },
    {
        firstName: "Rizz",
        lastName: "Rak",
    },
])
```

-   `update` - Partially updates entity by a given update options or entity id.

```typescript
await manager.update(User, { age: 18 }, { category: "ADULT" })
// executes UPDATE user SET category = ADULT WHERE age = 18

await manager.update(User, 1, { firstName: "Rizzrak" })
// executes UPDATE user SET firstName = Rizzrak WHERE id = 1
```

-   `upsert` - Inserts a new entity or array of entities unless they already exist in which case they are updated instead. Supported by AuroraDataApi, Cockroach, Mysql, Postgres, and Sqlite database drivers.

```typescript
await manager.upsert(
    User,
    [
        { externalId: "abc123", firstName: "Rizzrak" },
        { externalId: "bca321", firstName: "Karzzir" },
    ],
    ["externalId"],
)
/** executes
 *  INSERT INTO user
 *  VALUES
 *      (externalId = abc123, firstName = Rizzrak),
 *      (externalId = cba321, firstName = Karzzir),
 *  ON CONFLICT (externalId) DO UPDATE firstName = EXCLUDED.firstName
 **/
```

-   `delete` - Deletes entities by entity id, ids or given conditions:

```typescript
await manager.delete(User, 1)
await manager.delete(User, [1, 2, 3])
await manager.delete(User, { firstName: "Timber" })
```

-   `increment` - Increments some column by provided value of entities that match given options.

```typescript
await manager.increment(User, { firstName: "Timber" }, "age", 3)
```

-   `decrement` - Decrements some column by provided value that match given options.

```typescript
await manager.decrement(User, { firstName: "Timber" }, "age", 3)
```

-   `exists` - Check whether any entity exists that matches `FindOptions`.

```typescript
const exists = await manager.exists(User, {
    where: {
        firstName: "Timber",
    },
})
```

-   `existsBy` - Checks whether any entity exists that matches `FindOptionsWhere`.

```typescript
const exists = await manager.existsBy(User, { firstName: "Timber" })
```

-   `count` - Counts entities that match `FindOptions`. Useful for pagination.

```typescript
const count = await manager.count(User, {
    where: {
        firstName: "Timber",
    },
})
```

-   `countBy` - Counts entities that match `FindOptionsWhere`. Useful for pagination.

```typescript
const count = await manager.countBy(User, { firstName: "Timber" })
```

-   `find` - Finds entities that match given `FindOptions`.

```typescript
const timbers = await manager.find(User, {
    where: {
        firstName: "Timber",
    },
})
```

-   `findBy` - Finds entities that match given `FindWhereOptions`.

```typescript
const timbers = await manager.findBy(User, {
    firstName: "Timber",
})
```

-   `findAndCount` - Finds entities that match given `FindOptions`.
    Also counts all entities that match given conditions,
    but ignores pagination settings (from and take options).

```typescript
const [timbers, timbersCount] = await manager.findAndCount(User, {
    where: {
        firstName: "Timber",
    },
})
```

-   `findAndCountBy` - Finds entities that match given `FindOptionsWhere`.
    Also counts all entities that match given conditions,
    but ignores pagination settings (from and take options).

```typescript
const [timbers, timbersCount] = await manager.findAndCountBy(User, {
    firstName: "Timber",
})
```

-   `findOne` - Finds the first entity that matches given `FindOptions`.

```typescript
const timber = await manager.findOne(User, {
    where: {
        firstName: "Timber",
    },
})
```

-   `findOneBy` - Finds the first entity that matches given `FindOptionsWhere`.

```typescript
const timber = await manager.findOneBy(User, { firstName: "Timber" })
```

-   `findOneOrFail` - Finds the first entity that matches some id or find options.
    Rejects the returned promise if nothing matches.

```typescript
const timber = await manager.findOneOrFail(User, {
    where: {
        firstName: "Timber",
    },
})
```

-   `findOneByOrFail` - Finds the first entity that matches given `FindOptions`.
    Rejects the returned promise if nothing matches.

```typescript
const timber = await manager.findOneByOrFail(User, { firstName: "Timber" })
```

-   `clear` - Clears all the data from the given table (truncates/drops it).

```typescript
await manager.clear(User)
```

-   `getRepository` - Gets `Repository` to perform operations on a specific entity.
    Learn more about [Repositories](working-with-repository.md).

```typescript
const userRepository = manager.getRepository(User)
```

-   `getTreeRepository` - Gets `TreeRepository` to perform operations on a specific entity.
    Learn more about [Repositories](working-with-repository.md).

```typescript
const categoryRepository = manager.getTreeRepository(Category)
```

-   `getMongoRepository` - Gets `MongoRepository` to perform operations on a specific entity.
    Learn more about [MongoDB](./mongodb.md).

```typescript
const userRepository = manager.getMongoRepository(User)
```

-   `withRepository` - Gets custom repository instance used in a transaction.
    Learn more about [Custom repositories](custom-repository.md).

```typescript
const myUserRepository = manager.withRepository(UserRepository)
```

-   `release` - Releases query runner of an entity manager.
    Used only when query runner was created and managed manually.

```typescript
await manager.release()
```
