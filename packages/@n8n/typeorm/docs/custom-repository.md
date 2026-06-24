# Custom repositories

You can create a custom repository which should contain methods to work with your database.
For example, let's say we want to have a method called `findByName(firstName: string, lastName: string)`
which will search for users by a given first and last names.
The best place for this method is a `Repository`,
so we could call it like `userRepository.findByName(...)`.
You can achieve this using custom repositories.

There are several ways how custom repositories can be created.

-   [How to create custom repository](#how-to-create-custom-repository)
-   [Using custom repositories in transactions](#using-custom-repositories-in-transactions)

## How to create custom repository

It's common practice assigning a repository instance to a globally exported variable,
and use this variable across your app, for example:

```ts
// user.repository.ts
export const UserRepository = dataSource.getRepository(User)

// user.controller.ts
export class UserController {
    users() {
        return UserRepository.find()
    }
}
```

In order to extend `UserRepository` functionality you can use `.extend` method of `Repository` class:

```typescript
// user.repository.ts
export const UserRepository = dataSource.getRepository(User).extend({
    findByName(firstName: string, lastName: string) {
        return this.createQueryBuilder("user")
            .where("user.firstName = :firstName", { firstName })
            .andWhere("user.lastName = :lastName", { lastName })
            .getMany()
    },
})

// user.controller.ts
export class UserController {
    users() {
        return UserRepository.findByName("Timber", "Saw")
    }
}
```

## Using custom repositories in transactions

Transactions have their own scope of execution: they have their own query runner, entity manager and repository instances.
That's why using global (data source's) entity manager and repositories won't work in transactions.
In order to execute queries properly in scope of transaction you **must** use provided entity manager
and it's `getRepository` method. In order to use custom repositories within transaction,
you must use `withRepository` method of the provided entity manager instance:

```typescript
await connection.transaction(async (manager) => {
    // in transactions you MUST use manager instance provided by a transaction,
    // you cannot use global entity managers or repositories,
    // because this manager is exclusive and transactional

    const userRepository = manager.withRepository(UserRepository)
    await userRepository.createAndSave("Timber", "Saw")
    const timber = await userRepository.findByName("Timber", "Saw")
})
```
