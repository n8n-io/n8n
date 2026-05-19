# Relations FAQ

-   [How to create self referencing relation](#how-to-create-self-referencing-relation)
-   [How to use relation id without joining relation](#how-to-use-relation-id-without-joining-relation)
-   [How to load relations in entities](#how-to-load-relations-in-entities)
-   [Avoid relation property initializers](#avoid-relation-property-initializers)
-   [Avoid foreign key constraint creation](#avoid-foreign-key-constraint-creation)
-   [Avoid circular import errors](#avoid-circular-import-errors)

## How to create self referencing relation

Self-referencing relations are relations which have a relation to themselves.
This is useful when you are storing entities in a tree-like structures.
Also, "adjacency list" pattern is implemented using self-referenced relations.
For example, you want to create categories tree in your application.
Categories can nest categories, nested categories can nest other categories, etc.
Self-referencing relations come handy here.
Basically self-referencing relations are just regular relations that targets entity itself.
Example:

```typescript
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
} from "typeorm"

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    text: string

    @ManyToOne((type) => Category, (category) => category.childCategories)
    parentCategory: Category

    @OneToMany((type) => Category, (category) => category.parentCategory)
    childCategories: Category[]
}
```

## How to use relation id without joining relation

Sometimes you want to have, in your object, the id of the related object without loading it.
For example:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Profile {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    gender: string

    @Column()
    photo: string
}
```

```typescript
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
} from "typeorm"
import { Profile } from "./Profile"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToOne((type) => Profile)
    @JoinColumn()
    profile: Profile
}
```

When you load a user without `profile` joined you won't have any information about profile in your user object,
even profile id:

```javascript
User {
  id: 1,
  name: "Umed"
}
```

But sometimes you want to know what is the "profile id" of this user without loading the whole profile for this user.
To do this you just need to add another property to your entity with `@Column`
named exactly as the column created by your relation. Example:

```typescript
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
} from "typeorm"
import { Profile } from "./Profile"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({ nullable: true })
    profileId: number

    @OneToOne((type) => Profile)
    @JoinColumn()
    profile: Profile
}
```

That's all. Next time you load a user object it will contain a profile id:

```javascript
User {
  id: 1,
  name: "Umed",
  profileId: 1
}
```

## How to load relations in entities

The easiest way to load your entity relations is to use `relations` option in `FindOptions`:

```typescript
const users = await dataSource.getRepository(User).find({
    relations: {
        profile: true,
        photos: true,
        videos: true,
    },
})
```

Alternative and more flexible way is to use `QueryBuilder`:

```typescript
const user = await dataSource
    .getRepository(User)
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.profile", "profile")
    .leftJoinAndSelect("user.photos", "photo")
    .leftJoinAndSelect("user.videos", "video")
    .getMany()
```

Using `QueryBuilder` you can do `innerJoinAndSelect` instead of `leftJoinAndSelect`
(to learn the difference between `LEFT JOIN` and `INNER JOIN` refer to your SQL documentation),
you can join relation data by a condition, make ordering, etc.

Learn more about [`QueryBuilder`](select-query-builder.md).

## Avoid relation property initializers

Sometimes it is useful to initialize your relation properties, for example:

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

    @ManyToMany((type) => Category, (category) => category.questions)
    @JoinTable()
    categories: Category[] = [] // see = [] initialization here
}
```

However, in TypeORM entities it may cause problems.
To understand the problem, let's first try to load a Question entity WITHOUT the initializer set.
When you load a question it will return an object like this:

```javascript
Question {
    id: 1,
    title: "Question about ..."
}
```

Now when you save this object `categories` inside it won't be touched - because it is unset.

But if you have an initializer, the loaded object will look as follows:

```javascript
Question {
    id: 1,
    title: "Question about ...",
    categories: []
}
```

When you save the object it will check if there are any categories in the database bind to the question -
and it will detach all of them. Why? Because relation equal to `[]` or any items inside it will be considered
like something was removed from it, there is no other way to check if an object was removed from entity or not.

Therefore, saving an object like this will bring you problems - it will remove all previously set categories.

How to avoid this behaviour? Simply don't initialize arrays in your entities.
Same rule applies to a constructor - don't initialize it in a constructor as well.

## Avoid foreign key constraint creation

Sometimes for performance reasons you might want to have a relation between entities, but without foreign key constraint.
You can define if foreign key constraint should be created with `createForeignKeyConstraints` option (default: true).

```typescript
import { Entity, PrimaryColumn, Column, ManyToOne } from "typeorm"
import { Person } from "./Person"

@Entity()
export class ActionLog {
    @PrimaryColumn()
    id: number

    @Column()
    date: Date

    @Column()
    action: string

    @ManyToOne((type) => Person, {
        createForeignKeyConstraints: false,
    })
    person: Person
}
```

## Avoid circular import errors

Here is an example if you want to define your entities, and you don't want those to cause errors in some environments.
In this situation we have Action.ts and Person.ts importing each other for a many-to-many relationship.
We use import type so that we can use the type information without any JavaScript code being generated.

```typescript
import { Entity, PrimaryColumn, Column, ManytoMany } from "typeorm"
import type { Person } from "./Person"

@Entity()
export class ActionLog {
    @PrimaryColumn()
    id: number

    @Column()
    date: Date

    @Column()
    action: string

    @ManyToMany("Person", (person: Person) => person.id)
    person: Person
}
```

```typescript
import { Entity, PrimaryColumn, ManytoMany } from "typeorm"
import type { ActionLog } from "./Action"

@Entity()
export class Person {
    @PrimaryColumn()
    id: number

    @ManyToMany("ActionLog", (actionLog: ActionLog) => actionLog.id)
    log: ActionLog
}
```
