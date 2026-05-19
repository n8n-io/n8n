# What is EntityManager

Using `EntityManager` you can manage (insert, update, delete, load, etc.) any entity.
EntityManager is just like a collection of all entity repositories in a single place.

You can access the entity manager via DataSource.
Example how to use it:

```typescript
import { DataSource } from "typeorm"
import { User } from "./entity/User"

const myDataSource = new DataSource(/*...*/)
const user = await myDataSource.manager.findOneBy(User, {
    id: 1,
})
user.name = "Umed"
await myDataSource.manager.save(user)
```
