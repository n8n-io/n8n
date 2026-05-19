# What is Repository

`Repository` is just like `EntityManager` but its operations are limited to a concrete entity.
You can access the repository via EntityManager.

Example:

```typescript
import { User } from "./entity/User"

const userRepository = dataSource.getRepository(User)
const user = await userRepository.findOneBy({
    id: 1,
})
user.name = "Umed"
await userRepository.save(user)
```

There are 3 types of repositories:

-   `Repository` - Regular repository for any entity.
-   `TreeRepository` - Repository, extensions of `Repository` used for tree-entities
    (like entities marked with `@Tree` decorator).
    Has special methods to work with tree structures.
-   `MongoRepository` - Repository with special functions used only with MongoDB.
