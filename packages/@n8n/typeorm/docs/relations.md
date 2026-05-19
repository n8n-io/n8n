# Relations

* [What are relations](#what-are-relations)
* [Relation options](#relation-options)
* [Cascades](#cascades)
	* [Cascade Options](#cascade-options)
* [`@JoinColumn` options](#joincolumn-options)
* [`@JoinTable` options](#jointable-options)

## What are relations

Relations helps you to work with related entities easily.
There are several types of relations:

-   [one-to-one](./one-to-one-relations.md) using `@OneToOne`
-   [many-to-one](./many-to-one-one-to-many-relations.md) using `@ManyToOne`
-   [one-to-many](./many-to-one-one-to-many-relations.md) using `@OneToMany`
-   [many-to-many](./many-to-many-relations.md) using `@ManyToMany`

## Relation options

There are several options you can specify for relations:

-   `eager: boolean` - If set to true, the relation will always be loaded with the main entity when using `find*` methods or `QueryBuilder` on this entity
-   `cascade: boolean | ("insert" | "update")[]` - If set to true, the related object will be inserted and updated in the database. You can also specify an array of [cascade options](#cascade-options).
-   `onDelete: "RESTRICT"|"CASCADE"|"SET NULL"` - specifies how foreign key should behave when referenced object is deleted
-   `nullable: boolean` - Indicates whether this relation's column is nullable or not. By default it is nullable.
-   `orphanedRowAction: "nullify" | "delete" | "soft-delete" | disable` - When a parent is saved (cascading enabled) without a child/children that still exists in database, this will control what shall happen to them.
  _delete_ will remove these children from database. _soft-delete_ will mark children as soft-deleted. _nullify_ will remove the relation key. _disable_ will keep the relation intact. To delete, one has to use their own repository.

## Cascades

Cascades example:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm"
import { Question } from "./Question"

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @ManyToMany((type) => Question, (question) => question.categories)
    questions: Question[]
}
```

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

    @ManyToMany((type) => Category, (category) => category.questions, {
        cascade: true,
    })
    @JoinTable()
    categories: Category[]
}
```

```typescript
const category1 = new Category()
category1.name = "ORMs"

const category2 = new Category()
category2.name = "Programming"

const question = new Question()
question.title = "How to ask questions?"
question.text = "Where can I ask TypeORM-related questions?"
question.categories = [category1, category2]
await dataSource.manager.save(question)
```

As you can see in this example we did not call `save` for `category1` and `category2`.
They will be automatically inserted, because we set `cascade` to true.

Keep in mind - great power comes with great responsibility.
Cascades may seem like a good and easy way to work with relations,
but they may also bring bugs and security issues when some undesired object is being saved into the database.
Also, they provide a less explicit way of saving new objects into the database.

### Cascade Options

The `cascade` option can be set as a `boolean` or an array of cascade options `("insert" | "update" | "remove" | "soft-remove" | "recover")[]`.

It will default to `false`, meaning no cascades. Setting `cascade: true` will enable full cascades. You can also specify options by providing an array.

For example:

```typescript
@Entity(Post)
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    text: string

    // Full cascades on categories.
    @ManyToMany((type) => PostCategory, {
        cascade: true,
    })
    @JoinTable()
    categories: PostCategory[]

    // Cascade insert here means if there is a new PostDetails instance set
    // on this relation, it will be inserted automatically to the db when you save this Post entity
    @ManyToMany((type) => PostDetails, (details) => details.posts, {
        cascade: ["insert"],
    })
    @JoinTable()
    details: PostDetails[]

    // Cascade update here means if there are changes to an existing PostImage, it
    // will be updated automatically to the db when you save this Post entity
    @ManyToMany((type) => PostImage, (image) => image.posts, {
        cascade: ["update"],
    })
    @JoinTable()
    images: PostImage[]

    // Cascade insert & update here means if there are new PostInformation instances
    // or an update to an existing one, they will be automatically inserted or updated
    // when you save this Post entity
    @ManyToMany((type) => PostInformation, (information) => information.posts, {
        cascade: ["insert", "update"],
    })
    @JoinTable()
    informations: PostInformation[]
}
```

## `@JoinColumn` options

`@JoinColumn` not only defines which side of the relation contains the join column with a foreign key,
but also allows you to customize join column name and referenced column name.

When we set `@JoinColumn`, it automatically creates a column in the database named `propertyName + referencedColumnName`.
For example:

```typescript
@ManyToOne(type => Category)
@JoinColumn() // this decorator is optional for @ManyToOne, but required for @OneToOne
category: Category;
```

This code will create a `categoryId` column in the database.
If you want to change this name in the database you can specify a custom join column name:

```typescript
@ManyToOne(type => Category)
@JoinColumn({ name: "cat_id" })
category: Category;
```

Join columns are always a reference to some other columns (using a foreign key).
By default your relation always refers to the primary column of the related entity.
If you want to create relation with other columns of the related entity -
you can specify them in `@JoinColumn` as well:

```typescript
@ManyToOne(type => Category)
@JoinColumn({ referencedColumnName: "name" })
category: Category;
```

The relation now refers to `name` of the `Category` entity, instead of `id`.
Column name for that relation will become `categoryName`.

You can also join multiple columns. Note that they do not reference the primary column of the related entity by default: you must provide the referenced column name.

```typescript
@ManyToOne(type => Category)
@JoinColumn([
    { name: "category_id", referencedColumnName: "id" },
    { name: "locale_id", referencedColumnName: "locale_id" }
])
category: Category;
```

## `@JoinTable` options

`@JoinTable` is used for `many-to-many` relations and describes join columns of the "junction" table.
A junction table is a special separate table created automatically by TypeORM with columns that refer to the related entities.
You can change column names inside junction tables and their referenced columns with `@JoinColumn`:
You can also change the name of the generated "junction" table.

```typescript
@ManyToMany(type => Category)
@JoinTable({
    name: "question_categories", // table name for the junction table of this relation
    joinColumn: {
        name: "question",
        referencedColumnName: "id"
    },
    inverseJoinColumn: {
        name: "category",
        referencedColumnName: "id"
    }
})
categories: Category[];
```

If the destination table has composite primary keys,
then an array of properties must be sent to `@JoinTable`.
