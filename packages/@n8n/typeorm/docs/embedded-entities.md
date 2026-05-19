# Embedded Entities

There is an amazing way to reduce duplication in your app (using composition over inheritance) by using `embedded columns`.
Embedded column is a column which accepts a class with its own columns and merges those columns into the current entity's database table.
Example:

Let's say we have `User`, `Employee` and `Student` entities.
All those entities have few things in common - `first name` and `last name` properties

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: string

    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    isActive: boolean
}
```

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Employee {
    @PrimaryGeneratedColumn()
    id: string

    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    salary: string
}
```

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Student {
    @PrimaryGeneratedColumn()
    id: string

    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    faculty: string
}
```

What we can do is to reduce `firstName` and `lastName` duplication by creating a new class with those columns:

```typescript
import { Column } from "typeorm"

export class Name {
    @Column()
    first: string

    @Column()
    last: string
}
```

Then you can "connect" those columns in your entities:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import { Name } from "./Name"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: string

    @Column(() => Name)
    name: Name

    @Column()
    isActive: boolean
}
```

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import { Name } from "./Name"

@Entity()
export class Employee {
    @PrimaryGeneratedColumn()
    id: string

    @Column(() => Name)
    name: Name

    @Column()
    salary: number
}
```

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import { Name } from "./Name"

@Entity()
export class Student {
    @PrimaryGeneratedColumn()
    id: string

    @Column(() => Name)
    name: Name

    @Column()
    faculty: string
}
```

All columns defined in the `Name` entity will be merged into `user`, `employee` and `student`:

```shell
+-------------+--------------+----------------------------+
|                          user                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| nameFirst   | varchar(255) |                            |
| nameLast    | varchar(255) |                            |
| isActive    | boolean      |                            |
+-------------+--------------+----------------------------+

+-------------+--------------+----------------------------+
|                        employee                         |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| nameFirst   | varchar(255) |                            |
| nameLast    | varchar(255) |                            |
| salary      | int(11)      |                            |
+-------------+--------------+----------------------------+

+-------------+--------------+----------------------------+
|                         student                         |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| nameFirst   | varchar(255) |                            |
| nameLast    | varchar(255) |                            |
| faculty     | varchar(255) |                            |
+-------------+--------------+----------------------------+
```

This way code duplication in the entity classes is reduced.
You can use as many columns (or relations) in embedded classes as you need.
You even can have nested embedded columns inside embedded classes.
