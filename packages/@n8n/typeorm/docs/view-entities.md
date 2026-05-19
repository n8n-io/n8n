# View Entities

-   [What is View Entity?](#what-is-view-entity)
-   [View Entity columns](#view-entity-columns)
-   [View Column options](#view-column-options)
-   [Complete example](#complete-example)

## What is View Entity?

View entity is a class that maps to a database view.
You can create a view entity by defining a new class and mark it with `@ViewEntity()`:

`@ViewEntity()` accepts following options:

-   `name` - view name. If not specified, then view name is generated from entity class name.
-   `database` - database name in selected DB server.
-   `schema` - schema name.
-   `expression` - view definition. **Required parameter**.
-   `dependsOn` - List of other views on which the current views depends. If your view uses another view in it's definition, you can add it here so that migrations are generated in the correct order.

`expression` can be string with properly escaped columns and tables, depend on database used (postgres in example):

```typescript
@ViewEntity({
    expression: `
        SELECT "post"."id" AS "id", "post"."name" AS "name", "category"."name" AS "categoryName"
        FROM "post" "post"
        LEFT JOIN "category" "category" ON "post"."categoryId" = "category"."id"
    `
})
```

or an instance of QueryBuilder

```typescript
@ViewEntity({
    expression: (dataSource: DataSource) => dataSource
        .createQueryBuilder()
        .select("post.id", "id")
        .addSelect("post.name", "name")
        .addSelect("category.name", "categoryName")
        .from(Post, "post")
        .leftJoin(Category, "category", "category.id = post.categoryId")
})
```

**Note:** parameter binding is not supported due to drivers limitations. Use the literal parameters instead.

```typescript
@ViewEntity({
    expression: (dataSource: DataSource) => dataSource
        .createQueryBuilder()
        .select("post.id", "id")
        .addSelect("post.name", "name")
        .addSelect("category.name", "categoryName")
        .from(Post, "post")
        .leftJoin(Category, "category", "category.id = post.categoryId")
        .where("category.name = :name", { name: "Cars" })  // <-- this is wrong
        .where("category.name = 'Cars'")                   // <-- and this is right
})
```

Each view entity must be registered in your data source options:

```typescript
import { DataSource } from "typeorm"
import { UserView } from "./entity/UserView"

const dataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    entities: [UserView],
})
```

## View Entity columns

To map data from view into the correct entity columns you must mark entity columns with `@ViewColumn()`
decorator and specify these columns as select statement aliases.

example with string expression definition:

```typescript
import { ViewEntity, ViewColumn } from "typeorm"

@ViewEntity({
    expression: `
        SELECT "post"."id" AS "id", "post"."name" AS "name", "category"."name" AS "categoryName"
        FROM "post" "post"
        LEFT JOIN "category" "category" ON "post"."categoryId" = "category"."id"
    `,
})
export class PostCategory {
    @ViewColumn()
    id: number

    @ViewColumn()
    name: string

    @ViewColumn()
    categoryName: string
}
```

example using QueryBuilder:

```typescript
import { ViewEntity, ViewColumn } from "typeorm"

@ViewEntity({
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .select("post.id", "id")
            .addSelect("post.name", "name")
            .addSelect("category.name", "categoryName")
            .from(Post, "post")
            .leftJoin(Category, "category", "category.id = post.categoryId"),
})
export class PostCategory {
    @ViewColumn()
    id: number

    @ViewColumn()
    name: string

    @ViewColumn()
    categoryName: string
}
```

## View Column options

View Column options define additional options for your view entity columns, similar to [column options](entities.md#column-options) for regular entities.

You can specify view column options in `@ViewColumn`:

```typescript
@ViewColumn({
    name: "postName",
    // ...
})
name: string;
```

List of available options in `ViewColumnOptions`:

-   `name: string` - Column name in the database view.
-   `transformer: { from(value: DatabaseType): EntityType, to(value: EntityType): DatabaseType }` - Used to unmarshal properties of arbitrary type `DatabaseType` supported by the database into a type `EntityType`. Arrays of transformers are also supported and are applied in reverse order when reading. Note that because database views are read-only, `transformer.to(value)` will never be used.

## Materialized View Indices

There's support for creation of indices for materialized views if using `PostgreSQL`.

```typescript
@ViewEntity({
    materialized: true,
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .select("post.id", "id")
            .addSelect("post.name", "name")
            .addSelect("category.name", "categoryName")
            .from(Post, "post")
            .leftJoin(Category, "category", "category.id = post.categoryId"),
})
export class PostCategory {
    @ViewColumn()
    id: number

    @Index()
    @ViewColumn()
    name: string

    @Index("catname-idx")
    @ViewColumn()
    categoryName: string
}
```
However, `unique` is currently the only supported option for indices in materialized views. The rest of the indices options will be ignored.

````typescript
@Index("name-idx", { unique: true })
@ViewColumn()
name: string
````

## Complete example

Lets create two entities and a view containing aggregated data from these entities:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string
}
```

```typescript
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from "typeorm"
import { Category } from "./Category"

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    categoryId: number

    @ManyToOne(() => Category)
    @JoinColumn({ name: "categoryId" })
    category: Category
}
```

```typescript
import { ViewEntity, ViewColumn, DataSource } from "typeorm"

@ViewEntity({
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .select("post.id", "id")
            .addSelect("post.name", "name")
            .addSelect("category.name", "categoryName")
            .from(Post, "post")
            .leftJoin(Category, "category", "category.id = post.categoryId"),
})
export class PostCategory {
    @ViewColumn()
    id: number

    @ViewColumn()
    name: string

    @ViewColumn()
    categoryName: string
}
```

then fill these tables with data and request all data from PostCategory view:

```typescript
import { Category } from "./entity/Category"
import { Post } from "./entity/Post"
import { PostCategory } from "./entity/PostCategory"

const category1 = new Category()
category1.name = "Cars"
await dataSource.manager.save(category1)

const category2 = new Category()
category2.name = "Airplanes"
await dataSource.manager.save(category2)

const post1 = new Post()
post1.name = "About BMW"
post1.categoryId = category1.id
await dataSource.manager.save(post1)

const post2 = new Post()
post2.name = "About Boeing"
post2.categoryId = category2.id
await dataSource.manager.save(post2)

const postCategories = await dataSource.manager.find(PostCategory)
const postCategory = await dataSource.manager.findOneBy(PostCategory, { id: 1 })
```

the result in `postCategories` will be:

```
[ PostCategory { id: 1, name: 'About BMW', categoryName: 'Cars' },
  PostCategory { id: 2, name: 'About Boeing', categoryName: 'Airplanes' } ]
```

and in `postCategory`:

```
PostCategory { id: 1, name: 'About BMW', categoryName: 'Cars' }
```
