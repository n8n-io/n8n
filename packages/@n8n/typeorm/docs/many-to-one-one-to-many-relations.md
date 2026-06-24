# Many-to-one / one-to-many relations

Many-to-one / one-to-many is a relation where A contains multiple instances of B, but B contains only one instance of A.
Let's take for example `User` and `Photo` entities.
User can have multiple photos, but each photo is owned by only one single user.

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"
import { User } from "./User"

@Entity()
export class Photo {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    url: string

    @ManyToOne(() => User, (user) => user.photos)
    user: User
}
```

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm"
import { Photo } from "./Photo"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToMany(() => Photo, (photo) => photo.user)
    photos: Photo[]
}
```

Here we added `@OneToMany` to the `photos` property and specified the target relation type to be `Photo`.
You can omit `@JoinColumn` in a `@ManyToOne` / `@OneToMany` relation.
`@OneToMany` cannot exist without `@ManyToOne`.
If you want to use `@OneToMany`, `@ManyToOne` is required. However, the inverse is not required: If you only care about the `@ManyToOne` relationship, you can define it without having `@OneToMany` on the related entity.
Where you set `@ManyToOne` - its related entity will have "relation id" and foreign key.

This example will produce following tables:

```shell
+-------------+--------------+----------------------------+
|                         photo                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| url         | varchar(255) |                            |
| userId      | int(11)      | FOREIGN KEY                |
+-------------+--------------+----------------------------+

+-------------+--------------+----------------------------+
|                          user                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(255) |                            |
+-------------+--------------+----------------------------+
```

Example how to save such relation:

```typescript
const photo1 = new Photo()
photo1.url = "me.jpg"
await dataSource.manager.save(photo1)

const photo2 = new Photo()
photo2.url = "me-and-bears.jpg"
await dataSource.manager.save(photo2)

const user = new User()
user.name = "John"
user.photos = [photo1, photo2]
await dataSource.manager.save(user)
```

or alternatively you can do:

```typescript
const user = new User()
user.name = "Leo"
await dataSource.manager.save(user)

const photo1 = new Photo()
photo1.url = "me.jpg"
photo1.user = user
await dataSource.manager.save(photo1)

const photo2 = new Photo()
photo2.url = "me-and-bears.jpg"
photo2.user = user
await dataSource.manager.save(photo2)
```

With [cascades](./relations.md#cascades) enabled you can save this relation with only one `save` call.

To load a user with photos inside you must specify the relation in `FindOptions`:

```typescript
const userRepository = dataSource.getRepository(User)
const users = await userRepository.find({
    relations: {
        photos: true,
    },
})

// or from inverse side

const photoRepository = dataSource.getRepository(Photo)
const photos = await photoRepository.find({
    relations: {
        user: true,
    },
})
```

Or using `QueryBuilder` you can join them:

```typescript
const users = await dataSource
    .getRepository(User)
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.photos", "photo")
    .getMany()

// or from inverse side

const photos = await dataSource
    .getRepository(Photo)
    .createQueryBuilder("photo")
    .leftJoinAndSelect("photo.user", "user")
    .getMany()
```

With eager loading enabled on a relation, you don't have to specify relations in the find command as it will ALWAYS be loaded automatically.
If you use QueryBuilder eager relations are disabled, you have to use `leftJoinAndSelect` to load the relation.
