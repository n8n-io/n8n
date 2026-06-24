# One-to-one relations

One-to-one is a relation where A contains only one instance of B, and B contains only one instance of A.
Let's take for example `User` and `Profile` entities.
User can have only a single profile, and a single profile is owned by only a single user.

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

    @OneToOne(() => Profile)
    @JoinColumn()
    profile: Profile
}
```

Here we added `@OneToOne` to the `user` and specified the target relation type to be `Profile`.
We also added `@JoinColumn` which is required and must be set only on one side of the relation.
The side you set `@JoinColumn` on, that side's table will contain a "relation id" and foreign keys to the target entity table.

This example will produce the following tables:

```shell
+-------------+--------------+----------------------------+
|                        profile                          |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| gender      | varchar(255) |                            |
| photo       | varchar(255) |                            |
+-------------+--------------+----------------------------+

+-------------+--------------+----------------------------+
|                          user                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(255) |                            |
| profileId   | int(11)      | FOREIGN KEY                |
+-------------+--------------+----------------------------+
```

Again, `@JoinColumn` must be set only on one side of the relation - the side that must have the foreign key in the database table.

Example how to save such a relation:

```typescript
const profile = new Profile()
profile.gender = "male"
profile.photo = "me.jpg"
await dataSource.manager.save(profile)

const user = new User()
user.name = "Joe Smith"
user.profile = profile
await dataSource.manager.save(user)
```

With [cascades](./relations.md#cascades) enabled you can save this relation with only one `save` call.

To load user with profile inside you must specify relation in `FindOptions`:

```typescript
const users = await dataSource.getRepository(User).find({
    relations: {
        profile: true,
    },
})
```

Or using `QueryBuilder` you can join them:

```typescript
const users = await dataSource
    .getRepository(User)
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.profile", "profile")
    .getMany()
```

With eager loading enabled on a relation, you don't have to specify relations in the find command as it will ALWAYS be loaded automatically. If you use QueryBuilder eager relations are disabled, you have to use `leftJoinAndSelect` to load the relation.

Relations can be uni-directional and bi-directional.
Uni-directional are relations with a relation decorator only on one side.
Bi-directional are relations with decorators on both sides of a relation.

We just created a uni-directional relation. Let's make it bi-directional:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from "typeorm"
import { User } from "./User"

@Entity()
export class Profile {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    gender: string

    @Column()
    photo: string

    @OneToOne(() => User, (user) => user.profile) // specify inverse side as a second parameter
    user: User
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

    @OneToOne(() => Profile, (profile) => profile.user) // specify inverse side as a second parameter
    @JoinColumn()
    profile: Profile
}
```

We just made our relation bi-directional. Note, inverse relation does not have a `@JoinColumn`.
`@JoinColumn` must only be on one side of the relation - on the table that will own the foreign key.

Bi-directional relations allow you to join relations from both sides using `QueryBuilder`:

```typescript
const profiles = await dataSource
    .getRepository(Profile)
    .createQueryBuilder("profile")
    .leftJoinAndSelect("profile.user", "user")
    .getMany()
```
