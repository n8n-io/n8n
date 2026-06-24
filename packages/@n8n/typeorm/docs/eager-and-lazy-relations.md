# Eager and Lazy Relations

## Eager relations

Eager relations are loaded automatically each time you load entities from the database.
For example:

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
        eager: true,
    })
    @JoinTable()
    categories: Category[]
}
```

Now when you load questions you don't need to join or specify relations you want to load.
They will be loaded automatically:

```typescript
const questionRepository = dataSource.getRepository(Question)

// questions will be loaded with its categories
const questions = await questionRepository.find()
```

Eager relations only work when you use `find*` methods.
If you use `QueryBuilder` eager relations are disabled and have to use `leftJoinAndSelect` to load the relation.
Eager relations can only be used on one side of the relationship,
using `eager: true` on both sides of relationship is disallowed.

## Lazy relations

Entities in lazy relations are loaded once you access them.
Such relations must have `Promise` as type - you store your value in a promise,
and when you load them a promise is returned as well. Example:

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
    questions: Promise<Question[]>
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

    @ManyToMany((type) => Category, (category) => category.questions)
    @JoinTable()
    categories: Promise<Category[]>
}
```

`categories` is a Promise. It means it is lazy and it can store only a promise with a value inside.
Example how to save such relation:

```typescript
const category1 = new Category()
category1.name = "animals"
await dataSource.manager.save(category1)

const category2 = new Category()
category2.name = "zoo"
await dataSource.manager.save(category2)

const question = new Question()
question.categories = Promise.resolve([category1, category2])
await dataSource.manager.save(question)
```

Example how to load objects inside lazy relations:

```typescript
const [question] = await dataSource.getRepository(Question).find()
const categories = await question.categories
// you'll have all question's categories inside "categories" variable now
```

Note: if you came from other languages (Java, PHP, etc.) and are used to use lazy relations everywhere - be careful.
Those languages aren't asynchronous and lazy loading is achieved different way, that's why you don't work with promises there.
In JavaScript and Node.JS you have to use promises if you want to have lazy-loaded relations.
This is non-standard technique and considered experimental in TypeORM.
