# Migration from Sequelize to TypeORM

-   [Setting up a data source](#setting-up-a-data-source)
-   [Schema synchronization](#schema-synchronization)
-   [Creating a models](#creating-a-models)
-   [Other model settings](#other-model-settings)
-   [Working with models](#working-with-models)

## Setting up a data source

In sequelize you create a data source this way:

```javascript
const sequelize = new Sequelize("database", "username", "password", {
    host: "localhost",
    dialect: "mysql",
})

sequelize
    .authenticate()
    .then(() => {
        console.log("Data Source has been initialized successfully.")
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })
```

In TypeORM you create a data source following way:

```typescript
import { DataSource } from "typeorm"

const dataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    username: "username",
    password: "password",
})

dataSource
    .initialize()
    .then(() => {
        console.log("Data Source has been initialized successfully.")
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })
```

Then you can use `dataSource` instance from anywhere in your app.

Learn more about [Data Source](data-source.md)

## Schema synchronization

In sequelize you do schema synchronization this way:

```javascript
Project.sync({ force: true })
Task.sync({ force: true })
```

In TypeORM you just add `synchronize: true` in the data source options:

```typescript
const dataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    username: "username",
    password: "password",
    synchronize: true,
})
```

## Creating a models

This is how models are defined in sequelize:

```javascript
module.exports = function (sequelize, DataTypes) {
    const Project = sequelize.define("project", {
        title: DataTypes.STRING,
        description: DataTypes.TEXT,
    })

    return Project
}
```

```javascript
module.exports = function (sequelize, DataTypes) {
    const Task = sequelize.define("task", {
        title: DataTypes.STRING,
        description: DataTypes.TEXT,
        deadline: DataTypes.DATE,
    })

    return Task
}
```

In TypeORM these models are called entities and you can define them the following way:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Project {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column()
    description: string
}
```

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Task {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string

    @Column("text")
    description: string

    @Column()
    deadline: Date
}
```

It's highly recommended defining one entity class per file.
TypeORM allows you to use your classes as database models
and provides a declarative way to define what part of your model
will become part of your database table.
The power of TypeScript gives you type hinting and other useful features that you can use in classes.

Learn more about [Entities and columns](entities.md)

## Other model settings

The following in sequelize:

```javascript
flag: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
```

Can be achieved in TypeORM like this:

```typescript
@Column({ nullable: true, default: true })
flag: boolean;
```

Following in sequelize:

```javascript
flag: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
```

Is written like this in TypeORM:

```typescript
@Column({ default: () => "NOW()" })
myDate: Date;
```

Following in sequelize:

```javascript
someUnique: { type: Sequelize.STRING, unique: true },
```

Can be achieved this way in TypeORM:

```typescript
@Column({ unique: true })
someUnique: string;
```

Following in sequelize:

```javascript
fieldWithUnderscores: { type: Sequelize.STRING, field: "field_with_underscores" },
```

Translates to this in TypeORM:

```typescript
@Column({ name: "field_with_underscores" })
fieldWithUnderscores: string;
```

Following in sequelize:

```javascript
incrementMe: { type: Sequelize.INTEGER, autoIncrement: true },
```

Can be achieved this way in TypeORM:

```typescript
@Column()
@Generated()
incrementMe: number;
```

Following in sequelize:

```javascript
identifier: { type: Sequelize.STRING, primaryKey: true },
```

Can be achieved this way in TypeORM:

```typescript
@Column({ primary: true })
identifier: string;
```

To create `createDate` and `updateDate`-like columns you need to defined two columns (name it what you want) in your entity:

```typescript
@CreateDateColumn();
createDate: Date;

@UpdateDateColumn();
updateDate: Date;
```

### Working with models

To create and save a new model in sequelize you write:

```javascript
const employee = await Employee.create({
    name: "John Doe",
    title: "senior engineer",
})
```

In TypeORM there are several ways to create and save a new model:

```typescript
const employee = new Employee() // you can use constructor parameters as well
employee.name = "John Doe"
employee.title = "senior engineer"
await dataSource.getRepository(Employee).save(employee)
```

or active record pattern

```typescript
const employee = Employee.create({ name: "John Doe", title: "senior engineer" })
await employee.save()
```

if you want to load an existing entity from the database and replace some of its properties you can use the following method:

```typescript
const employee = await Employee.preload({ id: 1, name: "John Doe" })
```

Learn more about [Active Record vs Data Mapper](active-record-data-mapper.md) and [Repository API](repository-api.md).

To access properties in sequelize you do the following:

```typescript
console.log(employee.get("name"))
```

In TypeORM you simply do:

```typescript
console.log(employee.name)
```

To create an index in sequelize you do:

```typescript
sequelize.define(
    "user",
    {},
    {
        indexes: [
            {
                unique: true,
                fields: ["firstName", "lastName"],
            },
        ],
    },
)
```

In TypeORM you do:

```typescript
@Entity()
@Index(["firstName", "lastName"], { unique: true })
export class User {}
```

Learn more about [Indices](indices.md)
