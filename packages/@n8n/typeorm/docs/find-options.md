# Find Options

-   [Basic options](#basic-options)
-   [Advanced options](#advanced-options)

## Basic options

All repository and manager ` .find*` methods accept special options you can use to query data you need without using `QueryBuilder`:

-   `select` - indicates which properties of the main object must be selected

```typescript
userRepository.find({
    select: {
        firstName: true,
        lastName: true,
    },
})
```

will execute following query:

```sql
SELECT "firstName", "lastName" FROM "user"
```

-   `relations` - relations needs to be loaded with the main entity. Sub-relations can also be loaded (shorthand for `join` and `leftJoinAndSelect`)

```typescript
userRepository.find({
    relations: {
        profile: true,
        photos: true,
        videos: true,
    },
})
userRepository.find({
    relations: {
        profile: true,
        photos: true,
        videos: {
            videoAttributes: true,
        },
    },
})
```

will execute following queries:

```sql
SELECT * FROM "user"
LEFT JOIN "profile" ON "profile"."id" = "user"."profileId"
LEFT JOIN "photos" ON "photos"."id" = "user"."photoId"
LEFT JOIN "videos" ON "videos"."id" = "user"."videoId"

SELECT * FROM "user"
LEFT JOIN "profile" ON "profile"."id" = "user"."profileId"
LEFT JOIN "photos" ON "photos"."id" = "user"."photoId"
LEFT JOIN "videos" ON "videos"."id" = "user"."videoId"
LEFT JOIN "video_attributes" ON "video_attributes"."id" = "videos"."video_attributesId"
```

-   `where` - simple conditions by which entity should be queried.

```typescript
userRepository.find({
    where: {
        firstName: "Timber",
        lastName: "Saw",
    },
})
```

will execute following query:

```sql
SELECT * FROM "user"
WHERE "firstName" = 'Timber' AND "lastName" = 'Saw'
```

Querying a column from an embedded entity should be done with respect to the hierarchy in which it was defined. Example:

```typescript
userRepository.find({
    relations: {
        project: true,
    },
    where: {
        project: {
            name: "TypeORM",
            initials: "TORM",
        },
    },
})
```

will execute following query:

```sql
SELECT * FROM "user"
LEFT JOIN "project" ON "project"."id" = "user"."projectId"
WHERE "project"."name" = 'TypeORM' AND "project"."initials" = 'TORM'
```

Querying with OR operator:

```typescript
userRepository.find({
    where: [
        { firstName: "Timber", lastName: "Saw" },
        { firstName: "Stan", lastName: "Lee" },
    ],
})
```

will execute following query:

```sql
SELECT * FROM "user" WHERE ("firstName" = 'Timber' AND "lastName" = 'Saw') OR ("firstName" = 'Stan' AND "lastName" = 'Lee')
```

-   `order` - selection order.

```typescript
userRepository.find({
    order: {
        name: "ASC",
        id: "DESC",
    },
})
```

will execute following query:

```sql
SELECT * FROM "user"
ORDER BY "name" ASC, "id" DESC
```

-   `withDeleted` - include entities which have been soft deleted with `softDelete` or `softRemove`, e.g. have their `@DeleteDateColumn` column set. By default, soft deleted entities are not included.

```typescript
userRepository.find({
    withDeleted: true,
})
```

`find*` methods which return multiple entities (`find`, `findBy`, `findAndCount`, `findAndCountBy`) also accept following options:

-   `skip` - offset (paginated) from where entities should be taken.

```typescript
userRepository.find({
    skip: 5,
})
```

```sql
SELECT * FROM "user"
OFFSET 5
```

-   `take` - limit (paginated) - max number of entities that should be taken.

```typescript
userRepository.find({
    take: 10,
})
```

will execute following query:

```sql
SELECT * FROM "user"
LIMIT 10
```

\*\* `skip` and `take` should be used together

\*\* If you are using typeorm with MSSQL, and want to use `take` or `limit`, you need to use order as well or you will receive the following error: `'Invalid usage of the option NEXT in the FETCH statement.'`

```typescript
userRepository.find({
    order: {
        columnName: "ASC",
    },
    skip: 0,
    take: 10,
})
```

will execute following query:

```sql
SELECT * FROM "user"
ORDER BY "columnName" ASC
LIMIT 10 OFFSET 0
```

-   `cache` - Enables or disables query result caching. See [caching](caching.md) for more information and options.

```typescript
userRepository.find({
    cache: true,
})
```

-   `lock` - Enables locking mechanism for query. Can be used only in `findOne` and `findOneBy` methods.
    `lock` is an object which can be defined as:

```ts
{ mode: "optimistic", version: number | Date }
```

or

```ts
{
    mode: "pessimistic_read" |
        "pessimistic_write" |
        "dirty_read" |
        /*
            "pessimistic_partial_write" and "pessimistic_write_or_fail" are deprecated and
            will be removed in a future version.

            Use onLocked instead.
         */
        "pessimistic_partial_write" |
        "pessimistic_write_or_fail" |
        "for_no_key_update" |
        "for_key_share",

    tables: string[],
    onLocked: "nowait" | "skip_locked"
}
```

for example:

```typescript
userRepository.findOne({
    where: {
        id: 1,
    },
    lock: { mode: "optimistic", version: 1 },
})
```

See [lock modes](./select-query-builder.md#lock-modes) for more information

Complete example of find options:

```typescript
userRepository.find({
    select: {
        firstName: true,
        lastName: true,
    },
    relations: {
        profile: true,
        photos: true,
        videos: true,
    },
    where: {
        firstName: "Timber",
        lastName: "Saw",
        profile: {
            userName: "tshaw",
        },
    },
    order: {
        name: "ASC",
        id: "DESC",
    },
    skip: 5,
    take: 10,
    cache: true,
})
```

Find without arguments:

```ts
userRepository.find()
```

will execute following query:

```sql
SELECT * FROM "user"
```

## Advanced options

TypeORM provides a lot of built-in operators that can be used to create more complex comparisons:

-   `Not`

```ts
import { Not } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: Not("About #1"),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "title" != 'About #1'
```

-   `LessThan`

```ts
import { LessThan } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    likes: LessThan(10),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "likes" < 10
```

-   `LessThanOrEqual`

```ts
import { LessThanOrEqual } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    likes: LessThanOrEqual(10),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "likes" <= 10
```

-   `MoreThan`

```ts
import { MoreThan } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    likes: MoreThan(10),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "likes" > 10
```

-   `MoreThanOrEqual`

```ts
import { MoreThanOrEqual } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    likes: MoreThanOrEqual(10),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "likes" >= 10
```

-   `Equal`

```ts
import { Equal } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: Equal("About #2"),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "title" = 'About #2'
```

-   `Like`

```ts
import { Like } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: Like("%out #%"),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "title" LIKE '%out #%'
```

-   `ILike`

```ts
import { ILike } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: ILike("%out #%"),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "title" ILIKE '%out #%'
```

-   `Between`

```ts
import { Between } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    likes: Between(1, 10),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "likes" BETWEEN 1 AND 10
```

-   `In`

```ts
import { In } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: In(["About #2", "About #3"]),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "title" IN ('About #2','About #3')
```

-   `Any`

```ts
import { Any } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: Any(["About #2", "About #3"]),
})
```

will execute following query (Postgres notation):

```sql
SELECT * FROM "post" WHERE "title" = ANY(['About #2','About #3'])
```

-   `IsNull`

```ts
import { IsNull } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: IsNull(),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "title" IS NULL
```

-   `ArrayContains`

```ts
import { ArrayContains } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    categories: ArrayContains(["TypeScript"]),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "categories" @> '{TypeScript}'
```

-   `ArrayContainedBy`

```ts
import { ArrayContainedBy } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    categories: ArrayContainedBy(["TypeScript"]),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "categories" <@ '{TypeScript}'
```

-   `ArrayOverlap`

```ts
import { ArrayOverlap } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    categories: ArrayOverlap(["TypeScript"]),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "categories" && '{TypeScript}'
```

-   `Raw`

```ts
import { Raw } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    likes: Raw("dislikes - 4"),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "likes" = "dislikes" - 4
```

In the simplest case, a raw query is inserted immediately after the equal symbol.
But you can also completely rewrite the comparison logic using the function.

```ts
import { Raw } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    currentDate: Raw((alias) => `${alias} > NOW()`),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "currentDate" > NOW()
```

If you need to provide user input, you should not include the user input directly in your query as this may create a SQL injection vulnerability. Instead, you can use the second argument of the `Raw` function to provide a list of parameters to bind to the query.

```ts
import { Raw } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    currentDate: Raw((alias) => `${alias} > :date`, { date: "2020-10-06" }),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "currentDate" > '2020-10-06'
```

If you need to provide user input that is an array, you can bind them as a list of values in the SQL statement by using the special expression syntax:

```ts
import { Raw } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findby({
    title: Raw((alias) => `${alias} IN (:...titles)`, {
        titles: [
            "Go To Statement Considered Harmful",
            "Structured Programming",
        ],
    }),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "titles" IN ('Go To Statement Considered Harmful', 'Structured Programming')
```

## Combining Advanced Options

Also you can combine these operators with below:

-   `Not`

```ts
import { Not, MoreThan, Equal } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    likes: Not(MoreThan(10)),
    title: Not(Equal("About #2")),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE NOT("likes" > 10) AND NOT("title" = 'About #2')
```

-   `Or`

```ts
import { Not, MoreThan, ILike } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: Or(Equal("About #2"), ILike("About%")),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE "title" = 'About #2' OR "title" ILIKE 'About%'
```

-   `And`

```ts
import { And, Not, Equal, ILike } from "typeorm"

const loadedPosts = await dataSource.getRepository(Post).findBy({
    title: And(Not(Equal("About #2")), ILike("%About%")),
})
```

will execute following query:

```sql
SELECT * FROM "post" WHERE NOT("title" = 'About #2') AND "title" ILIKE '%About%'
```