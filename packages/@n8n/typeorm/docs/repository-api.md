# Repository APIs

-   [Repository APIs](#repository-apis)
    -   [`Repository` API](#repository-api)
        -   [Additional Options](#additional-options)
    -   [`TreeRepository` API](#treerepository-api)
    -   [`MongoRepository` API](#mongorepository-api)

## `Repository` API

-   `manager` - The `EntityManager` used by this repository.

```typescript
const manager = repository.manager
```

-   `metadata` - The `EntityMetadata` of the entity managed by this repository.
    Learn more about [transactions in Entity Metadata](./entity-metadata.md).

```typescript
const metadata = repository.metadata
```

-   `queryRunner` - The query runner used by `EntityManager`.
    Used only in transactional instances of EntityManager.

```typescript
const queryRunner = repository.queryRunner
```

-   `target` - The target entity class managed by this repository.
    Used only in transactional instances of EntityManager.

```typescript
const target = repository.target
```

-   `createQueryBuilder` - Creates a query builder use to build SQL queries.
    Learn more about [QueryBuilder](select-query-builder.md).

```typescript
const users = await repository
    .createQueryBuilder("user")
    .where("user.name = :name", { name: "John" })
    .getMany()
```

-   `hasId` - Checks if the given entity's primary column property is defined.

```typescript
if (repository.hasId(user)) {
    // ... do something
}
```

-   `getId` - Gets the primary column property values of the given entity.
    If entity has composite primary keys then the returned value will be an object with names and values of primary columns.

```typescript
const userId = repository.getId(user) // userId === 1
```

-   `create` - Creates a new instance of `User`. Optionally accepts an object literal with user properties
    which will be written into newly created user object

```typescript
const user = repository.create() // same as const user = new User();
const user = repository.create({
    id: 1,
    firstName: "Timber",
    lastName: "Saw",
}) // same as const user = new User(); user.firstName = "Timber"; user.lastName = "Saw";
```

-   `merge` - Merges multiple entities into a single entity.

```typescript
const user = new User()
repository.merge(user, { firstName: "Timber" }, { lastName: "Saw" }) // same as user.firstName = "Timber"; user.lastName = "Saw";
```

-   `preload` - Creates a new entity from the given plain javascript object. If the entity already exists in the database, then
    it loads it (and everything related to it), replaces all values with the new ones from the given object,
    and returns the new entity. The new entity is actually an entity loaded from the database with all properties
    replaced from the new object. <br>
    Note that given entity-like object must have an entity id / primary key to find entity by.
    Returns undefined if entity with given id was not found.

```typescript
const partialUser = {
    id: 1,
    firstName: "Rizzrak",
    profile: {
        id: 1,
    },
}
const user = await repository.preload(partialUser)
// user will contain all missing data from partialUser with partialUser property values:
// { id: 1, firstName: "Rizzrak", lastName: "Saw", profile: { id: 1, ... } }
```

-   `save` - Saves a given entity or array of entities.
    If the entity already exist in the database, it is updated.
    If the entity does not exist in the database, it is inserted.
    It saves all given entities in a single transaction (in the case of entity, manager is not transactional).
    Also supports partial updating since all undefined properties are skipped.
    Returns the saved entity/entities.

```typescript
await repository.save(user)
await repository.save([category1, category2, category3])
```

-   `remove` - Removes a given entity or array of entities.
    It removes all given entities in a single transaction (in the case of entity, manager is not transactional).
    Returns the removed entity/entities.

```typescript
await repository.remove(user)
await repository.remove([category1, category2, category3])
```

-   `insert` - Inserts a new entity, or array of entities.

```typescript
await repository.insert({
    firstName: "Timber",
    lastName: "Timber",
})

await repository.insert([
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
await repository.update({ age: 18 }, { category: "ADULT" })
// executes UPDATE user SET category = ADULT WHERE age = 18

await repository.update(1, { firstName: "Rizzrak" })
// executes UPDATE user SET firstName = Rizzrak WHERE id = 1
```

-   `upsert` - Inserts a new entity or array of entities unless they already exist in which case they are updated instead. Supported by AuroraDataApi, Cockroach, Mysql, Postgres, and Sqlite database drivers.

```typescript
await repository.upsert(
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

```typescript
await repository.upsert(
    [
        { externalId: "abc123", firstName: "Rizzrak" },
        { externalId: "bca321", firstName: "Karzzir" },
    ],
    {
        conflictPaths: ["externalId"],
        skipUpdateIfNoValuesChanged: true, // supported by postgres, skips update if it would not change row values
        upsertType: "upsert", //  "on-conflict-do-update" | "on-duplicate-key-update" | "upsert" - optionally provide an UpsertType - 'upsert' is currently only supported by CockroachDB
    },
)
/** executes
 *  INSERT INTO user
 *  VALUES
 *      (externalId = abc123, firstName = Rizzrak),
 *      (externalId = cba321, firstName = Karzzir),
 *  ON CONFLICT (externalId) DO UPDATE
 *  SET firstName = EXCLUDED.firstName
 *  WHERE user.firstName IS DISTINCT FROM EXCLUDED.firstName
 **/
```

```typescript
await repository.upsert(
    [
        { externalId: "abc123", firstName: "Rizzrak", dateAdded: "2020-01-01" },
        { externalId: "bca321", firstName: "Karzzir", dateAdded: "2022-01-01" },
    ],
    {
        conflictPaths: ["externalId"],
        skipUpdateIfNoValuesChanged: true, // supported by postgres, skips update if it would not change row values
        indexPredicate: "dateAdded > 2020-01-01", // supported by postgres, allows for partial indexes
    },
)
/** executes
 *  INSERT INTO user
 *  VALUES
 *      (externalId = abc123, firstName = Rizzrak, dateAdded = 2020-01-01),
 *      (externalId = cba321, firstName = Karzzir, dateAdded = 2022-01-01),
 *  ON CONFLICT (externalId) WHERE ( dateAdded > 2021-01-01 ) DO UPDATE
 *  SET firstName = EXCLUDED.firstName,
 *  SET dateAdded = EXCLUDED.dateAdded,
 *  WHERE user.firstName IS DISTINCT FROM EXCLUDED.firstName OR user.dateAdded IS DISTINCT FROM EXCLUDED.dateAdded
 **/
```

-   `delete` - Deletes entities by entity id, ids or given conditions:

```typescript
await repository.delete(1)
await repository.delete([1, 2, 3])
await repository.delete({ firstName: "Timber" })
```

-   `softDelete` and `restore` - Soft deleting and restoring a row by id

```typescript
const repository = dataSource.getRepository(Entity)
// Delete a entity
await repository.softDelete(1)
// And You can restore it using restore;
await repository.restore(1)
```

-   `softRemove` and `recover` - This is alternative to `softDelete` and `restore`.

```typescript
// You can soft-delete them using softRemove
const entities = await repository.find()
const entitiesAfterSoftRemove = await repository.softRemove(entities)

// And You can recover them using recover;
await repository.recover(entitiesAfterSoftRemove)
```

-   `increment` - Increments some column by provided value of entities that match given options.

```typescript
await repository.increment({ firstName: "Timber" }, "age", 3)
```

-   `decrement` - Decrements some column by provided value that match given options.

```typescript
await repository.decrement({ firstName: "Timber" }, "age", 3)
```

-   `exists` - Check whether any entity exists that matches `FindOptions`.

```typescript
const exists = await repository.exists({
    where: {
        firstName: "Timber",
    },
})
```

-   `existsBy` - Checks whether any entity exists that matches `FindOptionsWhere`.

```typescript
const exists = await repository.existsBy({ firstName: "Timber" })
```

-   `count` - Counts entities that match `FindOptions`. Useful for pagination.

```typescript
const count = await repository.count({
    where: {
        firstName: "Timber",
    },
})
```

-   `countBy` - Counts entities that match `FindOptionsWhere`. Useful for pagination.

```typescript
const count = await repository.countBy({ firstName: "Timber" })
```

-   `sum` - Returns the sum of a numeric field for all entities that match `FindOptionsWhere`.

```typescript
const sum = await repository.sum("age", { firstName: "Timber" })
```

-   `average` - Returns the average of a numeric field for all entities that match `FindOptionsWhere`.

```typescript
const average = await repository.average("age", { firstName: "Timber" })
```

-   `minimum` - Returns the minimum of a numeric field for all entities that match `FindOptionsWhere`.

```typescript
const minimum = await repository.minimum("age", { firstName: "Timber" })
```

-   `maximum` - Returns the maximum of a numeric field for all entities that match `FindOptionsWhere`.

```typescript
const maximum = await repository.maximum("age", { firstName: "Timber" })
```

-   `find` - Finds entities that match given `FindOptions`.

```typescript
const timbers = await repository.find({
    where: {
        firstName: "Timber",
    },
})
```

-   `findBy` - Finds entities that match given `FindWhereOptions`.

```typescript
const timbers = await repository.findBy({
    firstName: "Timber",
})
```

-   `findAndCount` - Finds entities that match given `FindOptions`.
    Also counts all entities that match given conditions,
    but ignores pagination settings (from and take options).

```typescript
const [timbers, timbersCount] = await repository.findAndCount({
    where: {
        firstName: "Timber",
    },
})
```

-   `findAndCountBy` - Finds entities that match given `FindOptionsWhere`.
    Also counts all entities that match given conditions,
    but ignores pagination settings (from and take options).

```typescript
const [timbers, timbersCount] = await repository.findAndCountBy({
    firstName: "Timber",
})
```

-   `findOne` - Finds the first entity that matches given `FindOptions`.

```typescript
const timber = await repository.findOne({
    where: {
        firstName: "Timber",
    },
})
```

-   `findOneBy` - Finds the first entity that matches given `FindOptionsWhere`.

```typescript
const timber = await repository.findOneBy({ firstName: "Timber" })
```

-   `findOneOrFail` - Finds the first entity that matches some id or find options.
    Rejects the returned promise if nothing matches.

```typescript
const timber = await repository.findOneOrFail({
    where: {
        firstName: "Timber",
    },
})
```

-   `findOneByOrFail` - Finds the first entity that matches given `FindOptions`.
    Rejects the returned promise if nothing matches.

```typescript
const timber = await repository.findOneByOrFail({ firstName: "Timber" })
```

-   `query` - Executes a raw SQL query.

```typescript
const rawData = await repository.query(`SELECT * FROM USERS`)
```

-   `clear` - Clears all the data from the given table (truncates/drops it).

```typescript
await repository.clear()
```

### Additional Options

Optional `SaveOptions` can be passed as parameter for `save`.

-   `data` - Additional data to be passed with persist method. This data can be used in subscribers then.
-   `listeners`: boolean - Indicates if listeners and subscribers are called for this operation. By default they are enabled, you can disable them by setting `{ listeners: false }` in save/remove options.
-   `transaction`: boolean - By default transactions are enabled and all queries in persistence operation are wrapped into the transaction. You can disable this behaviour by setting `{ transaction: false }` in the persistence options.
-   `chunk`: number - Breaks save execution into multiple groups of chunks. For example, if you want to save 100.000 objects but you have issues with saving them, you can break them into 10 groups of 10.000 objects (by setting `{ chunk: 10000 }`) and save each group separately. This option is needed to perform very big insertions when you have issues with underlying driver parameter number limitation.
-   `reload`: boolean - Flag to determine whether the entity that is being persisted should be reloaded during the persistence operation. It will work only on databases which does not support RETURNING / OUTPUT statement. Enabled by default.

Example:

```typescript
// users contains array of User Entities
userRepository.save(users, { chunk: users.length / 1000 })
```

Optional `RemoveOptions` can be passed as parameter for `remove` and `delete`.

-   `data` - Additional data to be passed with remove method. This data can be used in subscribers then.
-   `listeners`: boolean - Indicates if listeners and subscribers are called for this operation. By default they are enabled, you can disable them by setting `{ listeners: false }` in save/remove options.
-   `transaction`: boolean - By default transactions are enabled and all queries in persistence operation are wrapped into the transaction. You can disable this behaviour by setting `{ transaction: false }` in the persistence options.
-   `chunk`: number - Breaks removal execution into multiple groups of chunks. For example, if you want to remove 100.000 objects but you have issues doing so, you can break them into 10 groups of 10.000 objects, by setting `{ chunk: 10000 }`, and remove each group separately. This option is needed to perform very big deletions when you have issues with underlying driver parameter number limitation.

Example:

```typescript
// users contains array of User Entities
userRepository.remove(users, { chunk: entities.length / 1000 })
```

## `TreeRepository` API

For `TreeRepository` API refer to [the Tree Entities documentation](./tree-entities.md#working-with-tree-entities).

## `MongoRepository` API

For `MongoRepository` API refer to [the MongoDB documentation](./mongodb.md).
