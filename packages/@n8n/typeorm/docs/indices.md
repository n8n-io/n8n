# Indices

-   [Column indices](#column-indices)
-   [Unique indices](#unique-indices)
-   [Indices with multiple columns](#indices-with-multiple-columns)
-   [Spatial Indices](#spatial-indices)
-   [Disabling synchronization](#disabling-synchronization)

## Column indices

You can create a database index for a specific column by using `@Index` on a column you want to make an index.
You can create indices for any columns of your entity.
Example:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Index()
    @Column()
    firstName: string

    @Column()
    @Index()
    lastName: string
}
```

You can also specify an index name:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Index("name1-idx")
    @Column()
    firstName: string

    @Column()
    @Index("name2-idx")
    lastName: string
}
```

## Unique indices

To create an unique index you need to specify `{ unique: true }` in the index options:

> Note: CockroachDB stores unique indices as `UNIQUE` constraints

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Index({ unique: true })
    @Column()
    firstName: string

    @Column()
    @Index({ unique: true })
    lastName: string
}
```

## Indices with multiple columns

To create an index with multiple columns you need to put `@Index` on the entity itself
and specify all column property names which should be included in the index.
Example:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm"

@Entity()
@Index(["firstName", "lastName"])
@Index(["firstName", "middleName", "lastName"], { unique: true })
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    firstName: string

    @Column()
    middleName: string

    @Column()
    lastName: string
}
```

## Spatial Indices

MySQL, CockroachDB and PostgreSQL (when PostGIS is available) supports spatial indices.

To create a spatial index on a column in MySQL, add an `Index` with `spatial: true` on a column that uses a spatial type (`geometry`, `point`, `linestring`,
`polygon`, `multipoint`, `multilinestring`, `multipolygon`,
`geometrycollection`):

```typescript
@Entity()
export class Thing {
    @Column("point")
    @Index({ spatial: true })
    point: string
}
```

To create a spatial index on a column add an `Index` with `spatial: true` on a column that uses a spatial type (`geometry`, `geography`):

```typescript
export interface Geometry {
    type: "Point"
    coordinates: [Number, Number]
}

@Entity()
export class Thing {
    @Column("geometry", {
        spatialFeatureType: "Point",
        srid: 4326,
    })
    @Index({ spatial: true })
    point: Geometry
}
```

## Concurrent creation

In order to avoid having to obtain an access exclusive lock when creating and dropping indexes in postgres, you may create them using the CONCURRENTLY modifier.
If you want use the concurrent option, you need set `migrationsTransactionMode: none` between data source options.

Typeorm supports generating SQL with this option if when the concurrent option is specified on the index.

```typescript
@Index(["firstName", "middleName", "lastName"], { concurrent: true })
```

For more information see the [postgres documentation](https://www.postgresql.org/docs/current/sql-createindex.html).

## Disabling synchronization

TypeORM does not support some index options and definitions (e.g. `lower`, `pg_trgm`) because of lot of different database specifics and multiple
issues with getting information about exist database indices and synchronizing them automatically. In such cases you should create index manually
(for example in the migrations) with any index signature you want. To make TypeORM ignore these indices during synchronization use `synchronize: false`
option on `@Index` decorator.

For example, you create an index with case-insensitive comparison:

```sql
CREATE INDEX "POST_NAME_INDEX" ON "post" (lower("name"))
```

after that, you should disable synchronization for this index to avoid deletion on next schema sync:

```ts
@Entity()
@Index("POST_NAME_INDEX", { synchronize: false })
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string
}
```
