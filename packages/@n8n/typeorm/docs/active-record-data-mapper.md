# Active Record vs Data Mapper

-   [What is the Active Record pattern?](#what-is-the-active-record-pattern)
-   [What is the Data Mapper pattern?](#what-is-the-data-mapper-pattern)
-   [Which one should I choose?](#which-one-should-i-choose)

## What is the Active Record pattern?

In TypeORM you can use both the Active Record and the Data Mapper patterns.

Using the Active Record approach, you define all your query methods inside the model itself, and you save, remove, and load objects using model methods.

Simply said, the Active Record pattern is an approach to access your database within your models.
You can read more about the Active Record pattern on [Wikipedia](https://en.wikipedia.org/wiki/Active_record_pattern).

Example:

```typescript
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User extends BaseEntity {
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

All active-record entities must extend the `BaseEntity` class, which provides methods to work with the entity.
Example of how to work with such entity:

```typescript
// example how to save AR entity
const user = new User()
user.firstName = "Timber"
user.lastName = "Saw"
user.isActive = true
await user.save()

// example how to remove AR entity
await user.remove()

// example how to load AR entities
const users = await User.find({ skip: 2, take: 5 })
const newUsers = await User.findBy({ isActive: true })
const timber = await User.findOneBy({ firstName: "Timber", lastName: "Saw" })
```

`BaseEntity` has most of the methods of the standard `Repository`.
Most of the time you don't need to use `Repository` or `EntityManager` with active record entities.

Now let's say we want to create a function that returns users by first and last name.
We can create such functions as a static method in a `User` class:

```typescript
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    isActive: boolean

    static findByName(firstName: string, lastName: string) {
        return this.createQueryBuilder("user")
            .where("user.firstName = :firstName", { firstName })
            .andWhere("user.lastName = :lastName", { lastName })
            .getMany()
    }
}
```

And use it just like other methods:

```typescript
const timber = await User.findByName("Timber", "Saw")
```

## What is the Data Mapper pattern?

In TypeORM you can use both the Active Record and Data Mapper patterns.

Using the Data Mapper approach, you define all your query methods in separate classes called "repositories",
and you save, remove, and load objects using repositories.
In data mapper your entities are very dumb - they just define their properties and may have some "dummy" methods.

Simply said, data mapper is an approach to access your database within repositories instead of models.
You can read more about data mapper on [Wikipedia](https://en.wikipedia.org/wiki/Data_mapper_pattern).

Example:

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

Example of how to work with such entity:

```typescript
const userRepository = dataSource.getRepository(User)

// example how to save DM entity
const user = new User()
user.firstName = "Timber"
user.lastName = "Saw"
user.isActive = true
await userRepository.save(user)

// example how to remove DM entity
await userRepository.remove(user)

// example how to load DM entities
const users = await userRepository.find({ skip: 2, take: 5 })
const newUsers = await userRepository.findBy({ isActive: true })
const timber = await userRepository.findOneBy({
    firstName: "Timber",
    lastName: "Saw",
})
```

In order to extend standard repository with custom methods, use [custom repository pattern](custom-repository.md).

## Which one should I choose?

The decision is up to you.
Both strategies have their own cons and pros.

One thing we should always keep in mind with software development is how we are going to maintain our applications.
The `Data Mapper` approach helps with maintainability, which is more effective in larger apps.
The `Active Record` approach helps keep things simple which works well in smaller apps.
And simplicity is always a key to better maintainability.
