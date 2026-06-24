# Entities

- [Entities](#entities)
  - [What is Entity?](#what-is-entity)
  - [Entity columns](#entity-columns)
    - [Primary columns](#primary-columns)
    - [Special columns](#special-columns)
    - [Spatial columns](#spatial-columns)
  - [Column types](#column-types)
    - [Column types for `mysql` / `mariadb`](#column-types-for-mysql--mariadb)
    - [Column types for `postgres`](#column-types-for-postgres)
    - [Column types for `cockroachdb`](#column-types-for-cockroachdb)
    - [Column types for `sqlite` / `cordova` / `react-native` / `expo`](#column-types-for-sqlite--cordova--react-native--expo)
    - [Column types for `mssql`](#column-types-for-mssql)
    - [Column types for `oracle`](#column-types-for-oracle)
    - [Column types for `spanner`](#column-types-for-spanner)
    - [`enum` column type](#enum-column-type)
    - [`set` column type](#set-column-type)
    - [`simple-array` column type](#simple-array-column-type)
    - [`simple-json` column type](#simple-json-column-type)
    - [Columns with generated values](#columns-with-generated-values)
  - [Column options](#column-options)
  - [Entity inheritance](#entity-inheritance)
  - [Tree entities](#tree-entities)
    - [Adjacency list](#adjacency-list)
    - [Closure table](#closure-table)

## What is Entity?

Entity is a class that maps to a database table (or collection when using MongoDB).
You can create an entity by defining a new class and mark it with `@Entity()`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    isActive: boolean
}
```

This will create following database table:

```shell
+-------------+--------------+----------------------------+
|                          user                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| firstName   | varchar(255) |                            |
| lastName    | varchar(255) |                            |
| isActive    | boolean      |                            |
+-------------+--------------+----------------------------+
```

Basic entities consist of columns and relations.
Each entity **MUST** have a primary column (or ObjectId column if are using MongoDB).

Each entity must be registered in your data source options:

```typescript
import { DataSource } from "typeorm"
import { User } from "./entity/User"

const myDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    entities: [User],
})
```

Or you can specify the whole directory with all entities inside - and all of them will be loaded:

```typescript
import { DataSource } from "typeorm"

const dataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    entities: ["entity/*.js"],
})
```

If you want to use an alternative table name for the `User` entity you can specify it in `@Entity`: `@Entity("my_users")`.
If you want to set a base prefix for all database tables in your application you can specify `entityPrefix` in data source options.

When using an entity constructor its arguments **must be optional**. Since ORM creates instances of entity classes when loading from the database, therefore it is not aware of your constructor arguments.

Learn more about parameters `@Entity` in [Decorators reference](decorator-reference.md).

## Entity columns

Since database tables consist of columns your entities must consist of columns too.
Each entity class property you marked with `@Column` will be mapped to a database table column.

### Primary columns

Each entity must have at least one primary column.
There are several types of primary columns:

-   `@PrimaryColumn()` creates a primary column which takes any value of any type. You can specify the column type. If you don't specify a column type it will be inferred from the property type. The example below will create id with `int` as type which you must manually assign before save.

```typescript
import { Entity, PrimaryColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryColumn()
    id: number
}
```

-   `@PrimaryGeneratedColumn()` creates a primary column which value will be automatically generated with an auto-increment value. It will create `int` column with `auto-increment`/`serial`/`sequence`/`identity` (depend on the database and configuration provided). You don't have to manually assign its value before save - value will be automatically generated.

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number
}
```

-   `@PrimaryGeneratedColumn("uuid")` creates a primary column which value will be automatically generated with `uuid`. Uuid is a unique string id. You don't have to manually assign its value before save - value will be automatically generated.

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string
}
```

You can have composite primary columns as well:

```typescript
import { Entity, PrimaryColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryColumn()
    firstName: string

    @PrimaryColumn()
    lastName: string
}
```

When you save entities using `save` it always tries to find an entity in the database with the given entity id (or ids).
If id/ids are found then it will update this row in the database.
If there is no row with the id/ids, a new row will be inserted.

To find an entity by id you can use `manager.findOneBy` or `repository.findOneBy`. Example:

```typescript
// find one by id with single primary key
const person = await dataSource.manager.findOneBy(Person, { id: 1 })
const person = await dataSource.getRepository(Person).findOneBy({ id: 1 })

// find one by id with composite primary keys
const user = await dataSource.manager.findOneBy(User, {
    firstName: "Timber",
    lastName: "Saw",
})
const user = await dataSource.getRepository(User).findOneBy({
    firstName: "Timber",
    lastName: "Saw",
})
```

### Special columns

There are several special column types with additional functionality available:

-   `@CreateDateColumn` is a special column that is automatically set to the entity's insertion date.
    You don't need to set this column - it will be automatically set.

-   `@UpdateDateColumn` is a special column that is automatically set to the entity's update time
    each time you call `save` of entity manager or repository.
    You don't need to set this column - it will be automatically set.

-   `@DeleteDateColumn` is a special column that is automatically set to the entity's delete time each time you call soft-delete of entity manager or repository. You don't need to set this column - it will be automatically set. If the @DeleteDateColumn is set, the default scope will be "non-deleted".

-   `@VersionColumn` is a special column that is automatically set to the version of the entity (incremental number)
    each time you call `save` of entity manager or repository.
    You don't need to set this column - it will be automatically set.

### Spatial columns

MS SQL, MySQL, MariaDB, PostgreSQL and CockroachDB all support spatial columns. TypeORM's
support for each varies slightly between databases, particularly as the column
names vary between databases.

MS SQL and MySQL / MariaDB's TypeORM support exposes (and expects) geometries to
be provided as [well-known text
(WKT)](https://en.wikipedia.org/wiki/Well-known_text), so geometry columns
should be tagged with the `string` type.

```typescript
import { Entity, PrimaryColumn, Column } from "typeorm"

@Entity()
export class Thing {
    @PrimaryColumn()
    id: number

    @Column("point")
    point: string

    @Column("linestring")
    linestring: string
}

...

const thing = new Thing()
thing.point = "POINT(1 1)"
thing.linestring = "LINESTRING(0 0,1 1,2 2)"
```

TypeORM's PostgreSQL and CockroachDB support uses [GeoJSON](http://geojson.org/) as an
interchange format, so geometry columns should be tagged either as `object` or
`Geometry` (or subclasses, e.g. `Point`) after importing [`geojson`
types](https://www.npmjs.com/package/@types/geojson) or using TypeORM built in [GeoJSON types](../src/driver/types/GeoJsonTypes.ts).

```typescript
import {
    Entity,
    PrimaryColumn,
    Column,
    Point,
    LineString,
    MultiPoint
} from "typeorm"

@Entity()
export class Thing {
    @PrimaryColumn()
    id: number

    @Column("geometry")
    point: Point

    @Column("geometry")
    linestring: LineString

    @Column("geometry", {
        spatialFeatureType: "MultiPoint",
        srid: 4326,
    })
    multiPointWithSRID: MultiPoint
}

...

const thing = new Thing()
thing.point = {
    type: "Point",
    coordinates: [116.443987, 39.920843],
}
thing.linestring = {
    type: "LineString",
    coordinates: [
        [-87.623177, 41.881832],
        [-90.199402, 38.627003],
        [-82.446732, 38.413651],
        [-87.623177, 41.881832],
    ],
}
thing.multiPointWithSRID = {
    type: "MultiPoint",
    coordinates: [
        [100.0, 0.0],
        [101.0, 1.0],
    ],
}
```

TypeORM tries to do the right thing, but it's not always possible to determine
when a value being inserted or the result of a PostGIS function should be
treated as a geometry. As a result, you may find yourself writing code similar
to the following, where values are converted into PostGIS `geometry`s from
GeoJSON and into GeoJSON as `json`:

```typescript
import { Point } from "typeorm"

const origin: Point = {
    type: "Point",
    coordinates: [0, 0],
}

await dataSource.manager
    .createQueryBuilder(Thing, "thing")
    // convert stringified GeoJSON into a geometry with an SRID that matches the
    // table specification
    .where(
        "ST_Distance(geom, ST_SetSRID(ST_GeomFromGeoJSON(:origin), ST_SRID(geom))) > 0",
    )
    .orderBy(
        "ST_Distance(geom, ST_SetSRID(ST_GeomFromGeoJSON(:origin), ST_SRID(geom)))",
        "ASC",
    )
    .setParameters({
        // stringify GeoJSON
        origin: JSON.stringify(origin),
    })
    .getMany()

await dataSource.manager
    .createQueryBuilder(Thing, "thing")
    // convert geometry result into GeoJSON, treated as JSON (so that TypeORM
    // will know to deserialize it)
    .select("ST_AsGeoJSON(ST_Buffer(geom, 0.1))::json geom")
    .from("thing")
    .getMany()
```

## Column types

TypeORM supports all of the most commonly used database-supported column types.
Column types are database-type specific - this provides more flexibility on how your database schema will look like.

You can specify column type as first parameter of `@Column`
or in the column options of `@Column`, for example:

```typescript
@Column("int")
```

or

```typescript
@Column({ type: "int" })
```

If you want to specify additional type parameters you can do it via column options.
For example:

```typescript
@Column("varchar", { length: 200 })
```

or

```typescript
@Column({ type: "int", width: 200 })
```

> Note about `bigint` type: `bigint` column type, used in SQL databases, doesn't fit into the regular `number` type and maps property to a `string` instead.

### Column types for `mysql` / `mariadb`

`bit`, `int`, `integer`, `tinyint`, `smallint`, `mediumint`, `bigint`, `float`, `double`,
`double precision`, `dec`, `decimal`, `numeric`, `fixed`, `bool`, `boolean`, `date`, `datetime`,
`timestamp`, `time`, `year`, `char`, `nchar`, `national char`, `varchar`, `nvarchar`, `national varchar`,
`text`, `tinytext`, `mediumtext`, `blob`, `longtext`, `tinyblob`, `mediumblob`, `longblob`, `enum`, `set`,
`json`, `binary`, `varbinary`, `geometry`, `point`, `linestring`, `polygon`, `multipoint`, `multilinestring`,
`multipolygon`, `geometrycollection`, `uuid`, `inet4`, `inet6`

> Note: UUID, INET4, and INET6 are only available for mariadb and for respective versions that made them available.


### Column types for `postgres`

`int`, `int2`, `int4`, `int8`, `smallint`, `integer`, `bigint`, `decimal`, `numeric`, `real`,
`float`, `float4`, `float8`, `double precision`, `money`, `character varying`, `varchar`,
`character`, `char`, `text`, `citext`, `hstore`, `bytea`, `bit`, `varbit`, `bit varying`,
`timetz`, `timestamptz`, `timestamp`, `timestamp without time zone`, `timestamp with time zone`,
`date`, `time`, `time without time zone`, `time with time zone`, `interval`, `bool`, `boolean`,
`enum`, `point`, `line`, `lseg`, `box`, `path`, `polygon`, `circle`, `cidr`, `inet`, `macaddr`,
`tsvector`, `tsquery`, `uuid`, `xml`, `json`, `jsonb`, `int4range`, `int8range`, `numrange`,
`tsrange`, `tstzrange`, `daterange`, `int4multirange`, `int8multirange`, `nummultirange`,
`tsmultirange`, `tstzmultirange`, `multidaterange`, `geometry`, `geography`, `cube`, `ltree`

### Column types for `cockroachdb`

`array`, `bool`, `boolean`, `bytes`, `bytea`, `blob`, `date`, `numeric`, `decimal`, `dec`, `float`,
`float4`, `float8`, `double precision`, `real`, `inet`, `int`, `integer`, `int2`, `int8`, `int64`,
`smallint`, `bigint`, `interval`, `string`, `character varying`, `character`, `char`, `char varying`,
`varchar`, `text`, `time`, `time without time zone`, `timestamp`, `timestamptz`, `timestamp without time zone`,
`timestamp with time zone`, `json`, `jsonb`, `uuid`

> Note: CockroachDB returns all numeric data types as `string`. However if you omit column type and define your property as
> `number` ORM will `parseInt` string into number.

### Column types for `sqlite` / `cordova` / `react-native` / `expo`

`int`, `int2`, `int8`, `integer`, `tinyint`, `smallint`, `mediumint`, `bigint`, `decimal`,
`numeric`, `float`, `double`, `real`, `double precision`, `datetime`, `varying character`,
`character`, `native character`, `varchar`, `nchar`, `nvarchar2`, `unsigned big int`, `boolean`,
`blob`, `text`, `clob`, `date`

### Column types for `mssql`

`int`, `bigint`, `bit`, `decimal`, `money`, `numeric`, `smallint`, `smallmoney`, `tinyint`, `float`,
`real`, `date`, `datetime2`, `datetime`, `datetimeoffset`, `smalldatetime`, `time`, `char`, `varchar`,
`text`, `nchar`, `nvarchar`, `ntext`, `binary`, `image`, `varbinary`, `hierarchyid`, `sql_variant`,
`timestamp`, `uniqueidentifier`, `xml`, `geometry`, `geography`, `rowversion`

### Column types for `oracle`

`char`, `nchar`, `nvarchar2`, `varchar2`, `long`, `raw`, `long raw`, `number`, `numeric`, `float`, `dec`,
`decimal`, `integer`, `int`, `smallint`, `real`, `double precision`, `date`, `timestamp`, `timestamp with time zone`,
`timestamp with local time zone`, `interval year to month`, `interval day to second`, `bfile`, `blob`, `clob`,
`nclob`, `rowid`, `urowid`

### Column types for `spanner`

`bool`, `int64`, `float64`, `numeric`, `string`, `json`, `bytes`, `date`, `timestamp`, `array`

### `enum` column type

`enum` column type is supported by `postgres` and `mysql`. There are various possible column definitions:

Using typescript enums:

```typescript
export enum UserRole {
    ADMIN = "admin",
    EDITOR = "editor",
    GHOST = "ghost",
}

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.GHOST,
    })
    role: UserRole
}
```

> Note: String, numeric and heterogeneous enums are supported.

Using array with enum values:

```typescript
export type UserRoleType = "admin" | "editor" | "ghost",

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: "enum",
        enum: ["admin", "editor", "ghost"],
        default: "ghost"
    })
    role: UserRoleType
}
```

### `set` column type

`set` column type is supported by `mariadb` and `mysql`. There are various possible column definitions:

Using typescript enums:

```typescript
export enum UserRole {
    ADMIN = "admin",
    EDITOR = "editor",
    GHOST = "ghost",
}

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: "set",
        enum: UserRole,
        default: [UserRole.GHOST, UserRole.EDITOR],
    })
    roles: UserRole[]
}
```

Using array with `set` values:

```typescript
export type UserRoleType = "admin" | "editor" | "ghost",

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: "set",
        enum: ["admin", "editor", "ghost"],
        default: ["ghost", "editor"]
    })
    roles: UserRoleType[]
}
```

### `simple-array` column type

There is a special column type called `simple-array` which can store primitive array values in a single string column.
All values are separated by a comma. For example:

```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column("simple-array")
    names: string[]
}
```

```typescript
const user = new User()
user.names = ["Alexander", "Alex", "Sasha", "Shurik"]
```

Will be stored in a single database column as `Alexander,Alex,Sasha,Shurik` value.
When you'll load data from the database, the names will be returned as an array of names,
just like you stored them.

Note you **MUST NOT** have any comma in values you write.

### `simple-json` column type

There is a special column type called `simple-json` which can store any values which can be stored in database
via JSON.stringify.
Very useful when you do not have json type in your database and you want to store and load object
without any hassle.
For example:

```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column("simple-json")
    profile: { name: string; nickname: string }
}
```

```typescript
const user = new User()
user.profile = { name: "John", nickname: "Malkovich" }
```

Will be stored in a single database column as `{"name":"John","nickname":"Malkovich"}` value.
When you'll load data from the database, you will have your object/array/primitive back via JSON.parse

### Columns with generated values

You can create column with generated value using `@Generated` decorator. For example:

```typescript
@Entity()
export class User {
    @PrimaryColumn()
    id: number

    @Column()
    @Generated("uuid")
    uuid: string
}
```

`uuid` value will be automatically generated and stored into the database.

Besides "uuid" there is also "increment", "identity" (Postgres 10+ only) and "rowid" (CockroachDB only) generated types, however there are some limitations
on some database platforms with this type of generation (for example some databases can only have one increment column,
or some of them require increment to be a primary key).

## Column options

Column options defines additional options for your entity columns.
You can specify column options on `@Column`:

```typescript
@Column({
    type: "varchar",
    length: 150,
    unique: true,
    // ...
})
name: string;
```

List of available options in `ColumnOptions`:

-   `type: ColumnType` - Column type. One of the type listed [above](#column-types).
-   `name: string` - Column name in the database table.
    By default the column name is generated from the name of the property.
    You can change it by specifying your own name.

-   `length: number` - Column type's length. For example if you want to create `varchar(150)` type you specify column type and length options.
-   `width: number` - column type's display width. Used only for [MySQL integer types](https://dev.mysql.com/doc/refman/5.7/en/integer-types.html)
-   `onUpdate: string` - `ON UPDATE` trigger. Used only in [MySQL](https://dev.mysql.com/doc/refman/5.7/en/timestamp-initialization.html).
-   `nullable: boolean` - Makes column `NULL` or `NOT NULL` in the database. By default column is `nullable: false`.
-   `update: boolean` - Indicates if column value is updated by "save" operation. If false, you'll be able to write this value only when you first time insert the object. Default value is `true`.
-   `insert: boolean` - Indicates if column value is set the first time you insert the object. Default value is `true`.
-   `select: boolean` - Defines whether or not to hide this column by default when making queries. When set to `false`, the column data will not show with a standard query. By default column is `select: true`
-   `default: string` - Adds database-level column's `DEFAULT` value.
-   `primary: boolean` - Marks column as primary. Same if you use `@PrimaryColumn`.
-   `unique: boolean` - Marks column as unique column (creates unique constraint).
-   `comment: string` - Database's column comment. Not supported by all database types.
-   `precision: number` - The precision for a decimal (exact numeric) column (applies only for decimal column), which is the maximum
    number of digits that are stored for the values. Used in some column types.
-   `scale: number` - The scale for a decimal (exact numeric) column (applies only for decimal column), which represents the number of digits to the right of the decimal point and must not be greater than precision. Used in some column types.
-   `zerofill: boolean` - Puts `ZEROFILL` attribute on to a numeric column. Used only in MySQL. If `true`, MySQL automatically adds the `UNSIGNED` attribute to this column.
-   `unsigned: boolean` - Puts `UNSIGNED` attribute on to a numeric column. Used only in MySQL.
-   `charset: string` - Defines a column character set. Not supported by all database types.
-   `collation: string` - Defines a column collation.
-   `enum: string[]|AnyEnum` - Used in `enum` column type to specify list of allowed enum values. You can specify array of values or specify a enum class.
-   `enumName: string` - Defines the name for the used enum.
-   `asExpression: string` - Generated column expression. Used only in [MySQL](https://dev.mysql.com/doc/refman/5.7/en/create-table-generated-columns.html).
-   `generatedType: "VIRTUAL"|"STORED"` - Generated column type. Used only in [MySQL](https://dev.mysql.com/doc/refman/5.7/en/create-table-generated-columns.html).
-   `hstoreType: "object"|"string"` - Return type of `HSTORE` column. Returns value as string or as object. Used only in [Postgres](https://www.postgresql.org/docs/9.6/static/hstore.html).
-   `array: boolean` - Used for postgres and cockroachdb column types which can be array (for example int[])
-   `transformer: { from(value: DatabaseType): EntityType, to(value: EntityType): DatabaseType }` - Used to marshal properties of arbitrary type `EntityType` into a type `DatabaseType` supported by the database. Array of transformers are also supported and will be applied in natural order when writing, and in reverse order when reading. e.g. `[lowercase, encrypt]` will first lowercase the string then encrypt it when writing, and will decrypt then do nothing when reading.

Note: most of those column options are RDBMS-specific and aren't available in `MongoDB`.

## Entity inheritance

You can reduce duplication in your code by using entity inheritance.

For example, you have `Photo`, `Question`, `Post` entities:

```typescript
@Entity()
export class Photo {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    description: string

    @Column()
    size: string
}

@Entity()
export class Question {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    description: string

    @Column()
    answersCount: number
}

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    description: string

    @Column()
    viewCount: number
}
```

As you can see all those entities have common columns: `id`, `title`, `description`. To reduce duplication and produce a better abstraction we can create a base class called `Content` for them:

```typescript
export abstract class Content {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    description: string
}
@Entity()
export class Photo extends Content {
    @Column()
    size: string
}

@Entity()
export class Question extends Content {
    @Column()
    answersCount: number
}

@Entity()
export class Post extends Content {
    @Column()
    viewCount: number
}
```

All columns (relations, embeds, etc.) from parent entities (parent can extend other entity as well)
will be inherited and created in final entities.

## Tree entities

TypeORM supports the Adjacency list and Closure table patterns of storing tree structures.

### Adjacency list

Adjacency list is a simple model with self-referencing.
Benefit of this approach is simplicity,
drawback is you can't load a big tree at once because of join limitations.
Example:

```typescript
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    OneToMany,
} from "typeorm"

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @ManyToOne((type) => Category, (category) => category.children)
    parent: Category

    @OneToMany((type) => Category, (category) => category.parent)
    children: Category[]
}
```

### Closure table

A closure table stores relations between parent and child in a separate table in a special way.
Its efficient in both reads and writes.
To learn more about closure table take a look at [this awesome presentation by Bill Karwin](https://www.slideshare.net/billkarwin/models-for-hierarchical-data).
Example:

```typescript
import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    TreeChildren,
    TreeParent,
    TreeLevelColumn,
} from "typeorm"

@Entity()
@Tree("closure-table")
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @TreeChildren()
    children: Category[]

    @TreeParent()
    parent: Category

    @TreeLevelColumn()
    level: number
}
```
