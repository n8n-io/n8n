# Decorator reference

-   [Decorators reference](#decorators-reference)
    -   [Entity decorators](#entity-decorators)
        -   [`@Entity`](#entity)
        -   [`@ViewEntity`](#viewentity)
    -   [Column decorators](#column-decorators)
        -   [`@Column`](#column)
        -   [`@PrimaryColumn`](#primarycolumn)
        -   [`@PrimaryGeneratedColumn`](#primarygeneratedcolumn)
        -   [`@ObjectIdColumn`](#objectidcolumn)
        -   [`@CreateDateColumn`](#createdatecolumn)
        -   [`@UpdateDateColumn`](#updatedatecolumn)
        -   [`@DeleteDateColumn`](#deletedatecolumn)
        -   [`@VersionColumn`](#versioncolumn)
        -   [`@Generated`](#generated)
        -   [`@VirtualColumn`](#virtualcolumn)
    -   [Relation decorators](#relation-decorators)
        -   [`@OneToOne`](#onetoone)
        -   [`@ManyToOne`](#manytoone)
        -   [`@OneToMany`](#onetomany)
        -   [`@ManyToMany`](#manytomany)
        -   [`@JoinColumn`](#joincolumn)
        -   [`@JoinTable`](#jointable)
        -   [`@RelationId`](#relationid)
    -   [Subscriber and listener decorators](#subscriber-and-listener-decorators)
        -   [`@AfterLoad`](#afterload)
        -   [`@BeforeInsert`](#beforeinsert)
        -   [`@AfterInsert`](#afterinsert)
        -   [`@BeforeUpdate`](#beforeupdate)
        -   [`@AfterUpdate`](#afterupdate)
        -   [`@BeforeRemove`](#beforeremove)
        -   [`@AfterRemove`](#afterremove)
        -   [`@BeforeSoftRemove`](#beforesoftremove)
        -   [`@AfterSoftRemove`](#aftersoftremove)
        -   [`@BeforeRecover`](#beforerecover)
        -   [`@AfterRecover`](#afterrecover)
        -   [`@EventSubscriber`](#eventsubscriber)
    -   [Other decorators](#other-decorators)
        -   [`@Index`](#index)
        -   [`@Unique`](#unique)
        -   [`@Check`](#check)
        -   [`@Exclusion`](#exclusion)

## Entity decorators

#### `@Entity`

Marks your model as an entity. Entity is a class which is transformed into a database table.
You can specify the table name in the entity:

```typescript
@Entity("users")
export class User {}
```

This code will create a database table named "users".

You can also specify some additional entity options:

-   `name` - table name. If not specified, then table name is generated from entity class name.
-   `database` - database name in selected DB server.
-   `schema` - schema name.
-   `engine` - database engine to be set during table creation (works only in some databases).
-   `synchronize` - entities marked with `false` are skipped from schema updates.
-   `orderBy` - specifies default ordering for entities when using `find` operations and `QueryBuilder`.

Example:

```typescript
@Entity({
    name: "users",
    engine: "MyISAM",
    database: "example_dev",
    schema: "schema_with_best_tables",
    synchronize: false,
    orderBy: {
        name: "ASC",
        id: "DESC",
    },
})
export class User {}
```

Learn more about [Entities](entities.md).

#### `@ViewEntity`

View entity is a class that maps to a database view.

`@ViewEntity()` accepts following options:

-   `name` - view name. If not specified, then view name is generated from entity class name.
-   `database` - database name in selected DB server.
-   `schema` - schema name.
-   `expression` - view definition. **Required parameter**.

`expression` can be string with properly escaped columns and tables, depend on database used (postgres in example):

```typescript
@ViewEntity({
    expression: `
        SELECT "post"."id" "id", "post"."name" AS "name", "category"."name" AS "categoryName"
        FROM "post" "post"
        LEFT JOIN "category" "category" ON "post"."categoryId" = "category"."id"
    `,
})
export class PostCategory {}
```

or an instance of QueryBuilder

```typescript
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
export class PostCategory {}
```

**Note:** parameter binding is not supported due to drivers limitations. Use the literal parameters instead.

```typescript
@ViewEntity({
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .select("post.id", "id")
            .addSelect("post.name", "name")
            .addSelect("category.name", "categoryName")
            .from(Post, "post")
            .leftJoin(Category, "category", "category.id = post.categoryId")
            .where("category.name = :name", { name: "Cars" }) // <-- this is wrong
            .where("category.name = 'Cars'"), // <-- and this is right
})
export class PostCategory {}
```

Learn more about [View Entities](view-entities.md).

## Column decorators

#### `@Column`

Marks a property in your entity as a table column.
Example:

```typescript
@Entity("users")
export class User {
    @Column({ primary: true })
    id: number

    @Column({ type: "varchar", length: 200, unique: true })
    firstName: string

    @Column({ nullable: true })
    lastName: string

    @Column({ default: false })
    isActive: boolean
}
```

`@Column` accept several options you can use:

-   `type: ColumnType` - Column type. One of the [supported column types](entities.md#column-types).
-   `name: string` - Column name in the database table.
    By default, the column name is generated from the name of the property.
    You can change it by specifying your own name.
-   `length: string|number` - Column type's length. For example, if you want to create `varchar(150)` type
    you specify column type and length options.
-   `width: number` - column type's display width. Used only for [MySQL integer types](https://dev.mysql.com/doc/refman/5.7/en/integer-types.html)
-   `onUpdate: string` - `ON UPDATE` trigger. Used only in [MySQL](https://dev.mysql.com/doc/refman/5.7/en/timestamp-initialization.html).
-   `nullable: boolean` - determines whether the column can become `NULL` or always has to be `NOT NULL`. By default column is `nullable: false`.
-   `update: boolean` - Indicates if column value is updated by "save" operation. If false, you'll be able to write this value only when you first time insert the object.
    Default value is `true`.
-   `insert: boolean` - Indicates if column value is set the first time you insert the object. Default value is `true`.
-   `select: boolean` - Defines whether or not to hide this column by default when making queries. When set to `false`, the column data will not show with a standard query. By default column is `select: true`
-   `default: string` - Adds database-level column's `DEFAULT` value.
-   `primary: boolean` - Marks column as primary. Same as using `@PrimaryColumn`.
-   `unique: boolean` - Marks column as unique column (creates unique constraint). Default value is false.
-   `comment: string` - Database's column comment. Not supported by all database types.
-   `precision: number` - The precision for a decimal (exact numeric) column (applies only for decimal column), which is the maximum
    number of digits that are stored for the values. Used in some column types.
-   `scale: number` - The scale for a decimal (exact numeric) column (applies only for decimal column),
    which represents the number of digits to the right of the decimal point and must not be greater than precision.
    Used in some column types.
-   `zerofill: boolean` - Puts `ZEROFILL` attribute on to a numeric column. Used only in MySQL.
    If `true`, MySQL automatically adds the `UNSIGNED` attribute to this column.
-   `unsigned: boolean` - Puts `UNSIGNED` attribute on to a numeric column. Used only in MySQL.
-   `charset: string` - Defines a column character set. Not supported by all database types.
-   `collation: string` - Defines a column collation.
-   `enum: string[]|AnyEnum` - Used in `enum` column type to specify list of allowed enum values.
    You can specify array of values or specify a enum class.
-   `enumName: string` - A name for generated enum type. If not specified, TypeORM will generate a enum type from entity and column names - so it's necessary if you intend to use the same enum type in different tables.
-   `primaryKeyConstraintName: string` - A name for the primary key constraint. If not specified, then constraint name is generated from the table name and the names of the involved columns.
-   `asExpression: string` - Generated column expression. Used only in [MySQL](https://dev.mysql.com/doc/refman/5.7/en/create-table-generated-columns.html) and [Postgres](https://www.postgresql.org/docs/12/ddl-generated-columns.html).
-   `generatedType: "VIRTUAL"|"STORED"` - Generated column type. Used only in [MySQL](https://dev.mysql.com/doc/refman/5.7/en/create-table-generated-columns.html) and [Postgres (Only "STORED")](https://www.postgresql.org/docs/12/ddl-generated-columns.html).
-   `hstoreType: "object"|"string"` - Return type of `HSTORE` column. Returns value as string or as object. Used only in [Postgres](https://www.postgresql.org/docs/9.6/static/hstore.html).
-   `array: boolean` - Used for postgres and cockroachdb column types which can be array (for example int[]).
-   `transformer: ValueTransformer|ValueTransformer[]` - Specifies a value transformer (or array of value transformers) that is to be used to (un)marshal this column when reading or writing to the database. In case of an array, the value transformers will be applied in the natural order from entityValue to databaseValue, and in reverse order from databaseValue to entityValue.
-   `spatialFeatureType: string` - Optional feature type (`Point`, `Polygon`, `LineString`, `Geometry`) used as a constraint on a spatial column. If not specified, it will behave as though `Geometry` was provided. Used only in PostgreSQL and CockroachDB.
-   `srid: number` - Optional [Spatial Reference ID](https://postgis.net/docs/using_postgis_dbmanagement.html#spatial_ref_sys) used as a constraint on a spatial column. If not specified, it will default to `0`. Standard geographic coordinates (latitude/longitude in the WGS84 datum) correspond to [EPSG 4326](http://spatialreference.org/ref/epsg/wgs-84/). Used only in PostgreSQL and CockroachDB.

Learn more about [entity columns](entities.md#entity-columns).

#### `@PrimaryColumn`

Marks a property in your entity as a table primary column.
Same as `@Column` decorator but sets its `primary` option to true.

Example:

```typescript
@Entity()
export class User {
    @PrimaryColumn()
    id: number
}
```

`@PrimaryColumn()` supports custom primary key constraint name:

```typescript
@Entity()
export class User {
    @PrimaryColumn({ primaryKeyConstraintName: "pk_user_id" })
    id: number
}
```

> Note: when using `primaryKeyConstraintName` with multiple primary keys, the constraint name must be the same for all primary columns.

Learn more about [entity columns](entities.md#entity-columns).

#### `@PrimaryGeneratedColumn`

Marks a property in your entity as a table-generated primary column.
Column it creates is primary and its value is auto-generated.
Example:

```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number
}
```

`@PrimaryGeneratedColumn()` supports custom primary key constraint name:

```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn({ primaryKeyConstraintName: "pk_user_id" })
    id: number
}
```

There are four generation strategies:

-   `increment` - uses AUTO_INCREMENT / SERIAL / SEQUENCE (depend on database type) to generate incremental number.
-   `identity` - only for [PostgreSQL 10+](https://www.postgresql.org/docs/13/sql-createtable.html). Postgres versions above 10 support the SQL-Compliant **IDENTITY** column. When marking the generation strategy as `identity` the column will be produced using `GENERATED [ALWAYS|BY DEFAULT] AS IDENTITY`
-   `uuid` - generates unique `uuid` string.
-   `rowid` - only for [CockroachDB](https://www.cockroachlabs.com/docs/stable/serial.html). Value is automatically generated using the `unique_rowid()`
    function. This produces a 64-bit integer from the current timestamp and ID of the node executing the `INSERT` or `UPSERT` operation.
    > Note: property with a `rowid` generation strategy must be a `string` data type

Default generation strategy is `increment`, to change it to another strategy, simply pass it as the first argument to decorator:

```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string
}
```

Learn more about [entity columns](entities.md#entity-columns).

#### `@ObjectIdColumn`

Marks a property in your entity as ObjectId.
This decorator is only used in MongoDB.
Every entity in MongoDB must have a ObjectId column.
Example:

```typescript
@Entity()
export class User {
    @ObjectIdColumn()
    id: ObjectId
}
```

Learn more about [MongoDB](mongodb.md).

#### `@CreateDateColumn`

Special column that is automatically set to the entity's insertion time.
You don't need to write a value into this column - it will be automatically set.
Example:

```typescript
@Entity()
export class User {
    @CreateDateColumn()
    createdDate: Date
}
```

#### `@UpdateDateColumn`

Special column that is automatically set to the entity's update time
each time you call `save` from entity manager or repository.
You don't need to write a value into this column - it will be automatically set.

```typescript
@Entity()
export class User {
    @UpdateDateColumn()
    updatedDate: Date
}
```

#### `@DeleteDateColumn`

Special column that is automatically set to the entity's delete time each time you call soft-delete of entity manager or repository. You don't need to set this column - it will be automatically set.

TypeORM's own soft delete functionality utilizes global scopes to only pull "non-deleted" entities from the database.

If the @DeleteDateColumn is set, the default scope will be "non-deleted".

```typescript
@Entity()
export class User {
    @DeleteDateColumn()
    deletedDate: Date
}
```

#### `@VersionColumn`

Special column that is automatically set to the entity's version (incremental number)
each time you call `save` from entity manager or repository.
You don't need to write a value into this column - it will be automatically set.

```typescript
@Entity()
export class User {
    @VersionColumn()
    version: number
}
```

#### `@Generated`

Marks column to be a generated value. For example:

```typescript
@Entity()
export class User {
    @Column()
    @Generated("uuid")
    uuid: string
}
```

Value will be generated only once, before inserting the entity into the database.

#### `@VirtualColumn`

Special column that is never saved to the database and thus acts as a readonly property.
Each time you call `find` or `findOne` from the entity manager, the value is recalculated based on the query function that was provided in the VirtualColumn Decorator. The alias argument passed to the query references the exact entity alias of the generated query behind the scenes.

```typescript
@Entity({ name: "companies", alias: "COMP" })
export class Company extends BaseEntity {
  @PrimaryColumn("varchar", { length: 50 })
  name: string;

  @VirtualColumn({ query: (alias) => `SELECT COUNT("name") FROM "employees" WHERE "companyName" = ${alias}.name` })
  totalEmployeesCount: number;

  @OneToMany((type) => Employee, (employee) => employee.company)
  employees: Employee[];
}

@Entity({ name: "employees" })
export class Employee extends BaseEntity {
  @PrimaryColumn("varchar", { length: 50 })
  name: string;

  @ManyToOne((type) => Company, (company) => company.employees)
  company: Company;
}
```

## Relation decorators

#### `@OneToOne`

One-to-one is a relation where A contains only one instance of B, and B contains only one instance of A.
Let's take for example `User` and `Profile` entities.
User can have only a single profile, and a single profile is owned by only a single user.
Example:

```typescript
import { Entity, OneToOne, JoinColumn } from "typeorm"
import { Profile } from "./Profile"

@Entity()
export class User {
    @OneToOne((type) => Profile, (profile) => profile.user)
    @JoinColumn()
    profile: Profile
}
```

Learn more about [one-to-one relations](one-to-one-relations.md).

#### `@ManyToOne`

Many-to-one / one-to-many is a relation where A contains multiple instances of B, but B contains only one instance of A.
Let's take for example `User` and `Photo` entities.
User can have multiple photos, but each photo is owned by only one single user.
Example:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"
import { User } from "./User"

@Entity()
export class Photo {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    url: string

    @ManyToOne((type) => User, (user) => user.photos)
    user: User
}
```

Learn more about [many-to-one / one-to-many relations](many-to-one-one-to-many-relations.md).

#### `@OneToMany`

Many-to-one / one-to-many is a relation where A contains multiple instances of B, but B contains only one instance of A.
Let's take for example `User` and `Photo` entities.
User can have multiple photos, but each photo is owned by only a single user.
Example:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm"
import { Photo } from "./Photo"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToMany((type) => Photo, (photo) => photo.user)
    photos: Photo[]
}
```

Learn more about [many-to-one / one-to-many relations](many-to-one-one-to-many-relations.md).

#### `@ManyToMany`

Many-to-many is a relation where A contains multiple instances of B, and B contain multiple instances of A.
Let's take for example `Question` and `Category` entities.
Question can have multiple categories, and each category can have multiple questions.
Example:

```typescript
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable,
} from "typeorm"
import { Category } from "./Category"

@Entity()
export class Question {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    text: string

    @ManyToMany((type) => Category)
    @JoinTable()
    categories: Category[]
}
```

Learn more about [many-to-many relations](many-to-many-relations.md).

#### `@JoinColumn`

Defines which side of the relation contains the join column with a foreign key and
allows you to customize the join column name, referenced column name and foreign key name.
Example:

```typescript
@Entity()
export class Post {
    @ManyToOne((type) => Category)
    @JoinColumn({
        name: "cat_id",
        referencedColumnName: "name",
        foreignKeyConstraintName: "fk_cat_id"
    })
    category: Category
}
```

#### `@JoinTable`

Used for `many-to-many` relations and describes join columns of the "junction" table.
Junction table is a special, separate table created automatically by TypeORM with columns referenced to the related entities.
You can change the name of the generated "junction" table, the column names inside the junction table, their referenced
columns with the `joinColumn`- and `inverseJoinColumn` attributes, and the created foreign keys names.
You can also set parameter `synchronize` to false to skip schema update(same way as in @Entity)

Example:

```typescript
@Entity()
export class Post {
    @ManyToMany((type) => Category)
    @JoinTable({
        name: "question_categories",
        joinColumn: {
            name: "question",
            referencedColumnName: "id",
            foreignKeyConstraintName: "fk_question_categories_questionId"
        },
        inverseJoinColumn: {
            name: "category",
            referencedColumnName: "id",
            foreignKeyConstraintName: "fk_question_categories_categoryId"
        },
        synchronize: false,
    })
    categories: Category[]
}
```

If the destination table has composite primary keys,
then an array of properties must be sent to the `@JoinTable` decorator.

#### `@RelationId`

Loads id (or ids) of specific relations into properties.
For example, if you have a many-to-one `category` in your `Post` entity,
you can have a new category id by marking a new property with `@RelationId`.
Example:

```typescript
@Entity()
export class Post {
    @ManyToOne((type) => Category)
    category: Category

    @RelationId((post: Post) => post.category) // you need to specify target relation
    categoryId: number
}
```

This functionality works for all kind of relations, including `many-to-many`:

```typescript
@Entity()
export class Post {
    @ManyToMany((type) => Category)
    categories: Category[]

    @RelationId((post: Post) => post.categories)
    categoryIds: number[]
}
```

Relation id is used only for representation.
The underlying relation is not added/removed/changed when chaining the value.

## Subscriber and listener decorators

#### `@AfterLoad`

You can define a method with any name in entity and mark it with `@AfterLoad`
and TypeORM will call it each time the entity
is loaded using `QueryBuilder` or repository/manager find methods.
Example:

```typescript
@Entity()
export class Post {
    @AfterLoad()
    updateCounters() {
        if (this.likesCount === undefined) this.likesCount = 0
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@BeforeInsert`

You can define a method with any name in entity and mark it with `@BeforeInsert`
and TypeORM will call it before the entity is inserted using repository/manager `save`.
Example:

```typescript
@Entity()
export class Post {
    @BeforeInsert()
    updateDates() {
        this.createdDate = new Date()
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@AfterInsert`

You can define a method with any name in entity and mark it with `@AfterInsert`
and TypeORM will call it after the entity is inserted using repository/manager `save`.
Example:

```typescript
@Entity()
export class Post {
    @AfterInsert()
    resetCounters() {
        this.counters = 0
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@BeforeUpdate`

You can define a method with any name in the entity and mark it with `@BeforeUpdate`
and TypeORM will call it before an existing entity is updated using repository/manager `save`.
Example:

```typescript
@Entity()
export class Post {
    @BeforeUpdate()
    updateDates() {
        this.updatedDate = new Date()
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@AfterUpdate`

You can define a method with any name in the entity and mark it with `@AfterUpdate`
and TypeORM will call it after an existing entity is updated using repository/manager `save`.
Example:

```typescript
@Entity()
export class Post {
    @AfterUpdate()
    updateCounters() {
        this.counter = 0
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@BeforeRemove`

You can define a method with any name in the entity and mark it with `@BeforeRemove`
and TypeORM will call it before a entity is removed using repository/manager `remove`.
Example:

```typescript
@Entity()
export class Post {
    @BeforeRemove()
    updateStatus() {
        this.status = "removed"
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@AfterRemove`

You can define a method with any name in the entity and mark it with `@AfterRemove`
and TypeORM will call it after the entity is removed using repository/manager `remove`.
Example:

```typescript
@Entity()
export class Post {
    @AfterRemove()
    updateStatus() {
        this.status = "removed"
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@BeforeSoftRemove`

You can define a method with any name in the entity and mark it with `@BeforeSoftRemove`
and TypeORM will call it before a entity is soft removed using repository/manager `softRemove`.
Example:

```typescript
@Entity()
export class Post {
    @BeforeSoftRemove()
    updateStatus() {
        this.status = "soft-removed"
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@AfterSoftRemove`

You can define a method with any name in the entity and mark it with `@AfterSoftRemove`
and TypeORM will call it after the entity is soft removed using repository/manager `softRemove`.
Example:

```typescript
@Entity()
export class Post {
    @AfterSoftRemove()
    updateStatus() {
        this.status = "soft-removed"
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@BeforeRecover`

You can define a method with any name in the entity and mark it with `@BeforeRecover`
and TypeORM will call it before a entity is recovered using repository/manager `recover`.
Example:

```typescript
@Entity()
export class Post {
    @BeforeRecover()
    updateStatus() {
        this.status = "recovered"
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@AfterRecover`

You can define a method with any name in the entity and mark it with `@AfterRecover`
and TypeORM will call it after the entity is recovered using repository/manager `recover`.
Example:

```typescript
@Entity()
export class Post {
    @AfterRecover()
    updateStatus() {
        this.status = "recovered"
    }
}
```

Learn more about [listeners](listeners-and-subscribers.md).

#### `@EventSubscriber`

Marks a class as an event subscriber which can listen to specific entity events or any entity's events.
Events are fired using `QueryBuilder` and repository/manager methods.
Example:

```typescript
@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface<Post> {
    /**
     * Indicates that this subscriber only listen to Post events.
     */
    listenTo() {
        return Post
    }

    /**
     * Called before post insertion.
     */
    beforeInsert(event: InsertEvent<Post>) {
        console.log(`BEFORE POST INSERTED: `, event.entity)
    }
}
```

You can implement any method from `EntitySubscriberInterface`.
To listen to any entity, you just omit the `listenTo` method and use `any`:

```typescript
@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface {
    /**
     * Called before entity insertion.
     */
    beforeInsert(event: InsertEvent<any>) {
        console.log(`BEFORE ENTITY INSERTED: `, event.entity)
    }
}
```

Learn more about [subscribers](listeners-and-subscribers.md).

## Other decorators

#### `@Index`

This decorator allows you to create a database index for a specific column or columns.
It also allows you to mark column or columns to be unique.
This decorator can be applied to columns or an entity itself.
Use it on a column when an index on a single column is needed
and use it on the entity when a single index on multiple columns is required.
Examples:

```typescript
@Entity()
export class User {
    @Index()
    @Column()
    firstName: string

    @Index({ unique: true })
    @Column()
    lastName: string
}
```

```typescript
@Entity()
@Index(["firstName", "lastName"])
@Index(["lastName", "middleName"])
@Index(["firstName", "lastName", "middleName"], { unique: true })
export class User {
    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    middleName: string
}
```

Learn more about [indices](indices.md).

#### `@Unique`

This decorator allows you to create a database unique constraint for a specific column or columns.
This decorator can be applied only to an entity itself.
You must specify the entity field names (not database column names) as arguments.

Examples:

```typescript
@Entity()
@Unique(["firstName"])
@Unique(["lastName", "middleName"])
@Unique("UQ_NAMES", ["firstName", "lastName", "middleName"])
export class User {
    @Column({ name: "first_name" })
    firstName: string

    @Column({ name: "last_name" })
    lastName: string

    @Column({ name: "middle_name" })
    middleName: string
}
```

> Note: MySQL stores unique constraints as unique indices

#### `@Check`

This decorator allows you to create a database check constraint for a specific column or columns.
This decorator can be applied only to an entity itself.

Examples:

```typescript
@Entity()
@Check(`"firstName" <> 'John' AND "lastName" <> 'Doe'`)
@Check(`"age" > 18`)
export class User {
    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    age: number
}
```

> Note: MySQL does not support check constraints.

#### `@Exclusion`

This decorator allows you to create a database exclusion constraint for a specific column or columns.
This decorator can be applied only to an entity itself.

Examples:

```typescript
@Entity()
@Exclusion(`USING gist ("room" WITH =, tsrange("from", "to") WITH &&)`)
export class RoomBooking {
    @Column()
    room: string

    @Column()
    from: Date

    @Column()
    to: Date
}
```

> Note: Only PostgreSQL supports exclusion constraints.
