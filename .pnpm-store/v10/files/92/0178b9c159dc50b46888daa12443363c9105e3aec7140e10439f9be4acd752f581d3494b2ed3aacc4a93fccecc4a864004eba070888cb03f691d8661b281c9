<div align="center">
  <a href="http://typeorm.io/">
    <img src="https://github.com/typeorm/typeorm/raw/master/resources/logo_big.png" width="492" height="228">
  </a>
  <br>
  <br>
	<a href="https://badge.fury.io/js/typeorm">
		<img src="https://badge.fury.io/js/typeorm.svg">
	</a>
	<a href="https://join.slack.com/t/typeorm/shared_invite/zt-uu12ljeb-OH_0086I379fUDApYJHNuw">
		<img src="https://img.shields.io/badge/chat-on%20slack-blue.svg">
	</a>
  <br>
  <br>
</div>

TypeORM is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
that can run in NodeJS platforms and can be used with TypeScript and JavaScript (ES2021).
Its goal is to always support the latest JavaScript features and provide additional features
that help you to develop any kind of application that uses databases - from
small applications with a few tables to large-scale enterprise applications
with multiple databases.

TypeORM supports both [Active Record](./docs/active-record-data-mapper.md#what-is-the-active-record-pattern) and [Data Mapper](./docs/active-record-data-mapper.md#what-is-the-data-mapper-pattern) patterns,
unlike all other JavaScript ORMs currently in existence,
which means you can write high-quality, loosely coupled, scalable,
maintainable applications in the most productive way.

TypeORM is highly influenced by other ORMs, such as [Hibernate](http://hibernate.org/orm/),
[Doctrine](http://www.doctrine-project.org/) and [Entity Framework](https://www.asp.net/entity-framework).

## Features

-   Supports both [DataMapper](./docs/active-record-data-mapper.md#what-is-the-data-mapper-pattern) and [ActiveRecord](./docs/active-record-data-mapper.md#what-is-the-active-record-pattern) (your choice).
-   Entities and columns.
-   Database-specific column types.
-   Entity manager.
-   Repositories and custom repositories.
-   Clean object-relational model.
-   Associations (relations).
-   Eager and lazy relations.
-   Uni-directional, bi-directional, and self-referenced relations.
-   Supports multiple inheritance patterns.
-   Cascades.
-   Indices.
-   Transactions.
-   Migrations and automatic migrations generation.
-   Connection pooling.
-   Replication.
-   Using multiple database instances.
-   Working with multiple database types.
-   Cross-database and cross-schema queries.
-   Elegant-syntax, flexible and powerful QueryBuilder.
-   Left and inner joins.
-   Proper pagination for queries using joins.
-   Query caching.
-   Streaming raw results.
-   Logging.
-   Listeners and subscribers (hooks).
-   Supports closure table pattern.
-   Schema declaration in models or separate configuration files.
-   Supports MySQL / MariaDB / Postgres / SQLite.
-   Works in NodeJS platforms.
-   TypeScript and JavaScript support.
-   ESM and CommonJS support.
-   Produced code is performant, flexible, clean, and maintainable.
-   Follows all possible best practices.
-   CLI.

And more...

## Supported Drivers

This is a specialized fork of TypeORM that supports only the following database drivers:

- **MySQL** - Full MySQL database support
- **MariaDB** - Full MariaDB database support (uses MySQL driver)
- **PostgreSQL** - Full PostgreSQL database support
- **SQLite** - Standard file-based SQLite support
- **SQLite-Pooled** - Enhanced SQLite with connection pooling for better performance

This fork focuses on server-side Node.js applications and core SQL database support.

With TypeORM your models look like this:

```javascript
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
    age: number
}
```

And your domain logic looks like this:

```javascript
const userRepository = MyDataSource.getRepository(User)

const user = new User()
user.firstName = "Timber"
user.lastName = "Saw"
user.age = 25
await userRepository.save(user)

const allUsers = await userRepository.find()
const firstUser = await userRepository.findOneBy({
    id: 1,
}) // find by id
const timber = await userRepository.findOneBy({
    firstName: "Timber",
    lastName: "Saw",
}) // find by firstName and lastName

await userRepository.remove(timber)
```

Alternatively, if you prefer to use the `ActiveRecord` implementation, you can use it as well:

```javascript
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm"

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    age: number
}
```

And your domain logic will look this way:

```javascript
const user = new User()
user.firstName = "Timber"
user.lastName = "Saw"
user.age = 25
await user.save()

const allUsers = await User.find()
const firstUser = await User.findOneBy({
    id: 1,
})
const timber = await User.findOneBy({
    firstName: "Timber",
    lastName: "Saw"
})

await timber.remove()
```

## Installation

1. Install the npm package:

    `npm install typeorm --save`

2. You need to install `reflect-metadata` shim:

    `npm install reflect-metadata --save`

    and import it somewhere in the global place of your app (for example in `app.ts`):

    `import "reflect-metadata"`

3. You may need to install node typings:

    `npm install @types/node --save-dev`

4. Install a database driver:

    - for **MySQL** or **MariaDB**

        `npm install mysql --save` (you can install `mysql2` instead as well)

    - for **PostgreSQL** or **CockroachDB**

        `npm install pg --save`

    - for **SQLite**

        `npm install sqlite3 --save`

    Install only _one_ of them, depending on which database you use.

##### TypeScript configuration

Also, make sure you are using TypeScript version **4.5** or higher,
and you have enabled the following settings in `tsconfig.json`:

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

You may also need to enable `es6` in the `lib` section of compiler options, or install `es6-shim` from `@types`.

## Quick Start

The quickest way to get started with TypeORM is to use its CLI commands to generate a starter project.
Quick start works only if you are using TypeORM in a NodeJS application.
If you are using other platforms, proceed to the [step-by-step guide](#step-by-step-guide).

To create a new project using CLI, run the following command:

```shell
npx typeorm init --name MyProject --database postgres
```

Where `name` is the name of your project and `database` is the database you'll use.
Database can be one of the following values: `mysql`, `mariadb`, `postgres`, `sqlite`.

This command will generate a new project in the `MyProject` directory with the following files:

```
MyProject
├── src                   // place of your TypeScript code
│   ├── entity            // place where your entities (database models) are stored
│   │   └── User.ts       // sample entity
│   ├── migration         // place where your migrations are stored
│   ├── data-source.ts    // data source and all connection configuration
│   └── index.ts          // start point of your application
├── .gitignore            // standard gitignore file
├── package.json          // node module dependencies
├── README.md             // simple readme file
└── tsconfig.json         // TypeScript compiler options
```

> You can also run `typeorm init` on an existing node project, but be careful - it may override some files you already have.

The next step is to install new project dependencies:

```shell
cd MyProject
npm install
```

After you have all dependencies installed, edit the `data-source.ts` file and put your own database connection configuration options in there:

```ts
export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "test",
    password: "test",
    database: "test",
    synchronize: true,
    logging: true,
    entities: [Post, Category],
    subscribers: [],
    migrations: [],
})
```

Particularly, most of the time you'll only need to configure
`host`, `username`, `password`, `database` and maybe `port` options.

Once you finish with configuration and all node modules are installed, you can run your application:

```shell
npm start
```

That's it, your application should successfully run and insert a new user into the database.
You can continue to work with this project and integrate other modules you need and start
creating more entities.

> You can generate an ESM project by running
> `npx typeorm init --name MyProject --database postgres --module esm` command.

> You can generate an even more advanced project with express installed by running
> `npx typeorm init --name MyProject --database mysql --express` command.

> You can generate a docker-compose file by running
> `npx typeorm init --name MyProject --database postgres --docker` command.

## Step-by-Step Guide

What are you expecting from ORM?
First of all, you are expecting it will create database tables for you
and find / insert / update / delete your data without the pain of
having to write lots of hardly maintainable SQL queries.
This guide will show you how to set up TypeORM from scratch and make it do what you are expecting from an ORM.

### Create a model

Working with a database starts with creating tables.
How do you tell TypeORM to create a database table?
The answer is - through the models.
Your models in your app are your database tables.

For example, you have a `Photo` model:

```javascript
export class Photo {
    id: number
    name: string
    description: string
    filename: string
    views: number
    isPublished: boolean
}
```

And you want to store photos in your database.
To store things in the database, first, you need a database table,
and database tables are created from your models.
Not all models, but only those you define as _entities_.

### Create an entity

_Entity_ is your model decorated by an `@Entity` decorator.
A database table will be created for such models.
You work with entities everywhere in TypeORM.
You can load/insert/update/remove and perform other operations with them.

Let's make our `Photo` model an entity:

```javascript
import { Entity } from "typeorm"

@Entity()
export class Photo {
    id: number
    name: string
    description: string
    filename: string
    views: number
    isPublished: boolean
}
```

Now, a database table will be created for the `Photo` entity and we'll be able to work with it anywhere in our app.
We have created a database table, however, what table can exist without columns?
Let's create a few columns in our database table.

### Adding table columns

To add database columns, you simply need to decorate an entity's properties you want to make into a column
with a `@Column` decorator.

```javascript
import { Entity, Column } from "typeorm"

@Entity()
export class Photo {
    @Column()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @Column()
    filename: string

    @Column()
    views: number

    @Column()
    isPublished: boolean
}
```

Now `id`, `name`, `description`, `filename`, `views`, and `isPublished` columns will be added to the `photo` table.
Column types in the database are inferred from the property types you used, e.g.
`number` will be converted into `integer`, `string` into `varchar`, `boolean` into `bool`, etc.
But you can use any column type your database supports by explicitly specifying a column type into the `@Column` decorator.

We generated a database table with columns, but there is one thing left.
Each database table must have a column with a primary key.

### Creating a primary column

Each entity **must** have at least one primary key column.
This is a requirement and you can't avoid it.
To make a column a primary key, you need to use the `@PrimaryColumn` decorator.

```javascript
import { Entity, Column, PrimaryColumn } from "typeorm"

@Entity()
export class Photo {
    @PrimaryColumn()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @Column()
    filename: string

    @Column()
    views: number

    @Column()
    isPublished: boolean
}
```

### Creating an auto-generated column

Now, let's say you want your id column to be auto-generated (this is known as auto-increment / sequence / serial / generated identity column).
To do that, you need to change the `@PrimaryColumn` decorator to a `@PrimaryGeneratedColumn` decorator:

```javascript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Photo {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @Column()
    filename: string

    @Column()
    views: number

    @Column()
    isPublished: boolean
}
```

### Column data types

Next, let's fix our data types. By default, the string is mapped to a varchar(255)-like type (depending on the database type).
The number is mapped to an integer-like type (depending on the database type).
We don't want all our columns to be limited varchars or integers.
Let's setup the correct data types:

```javascript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Photo {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        length: 100,
    })
    name: string

    @Column("text")
    description: string

    @Column()
    filename: string

    @Column("double")
    views: number

    @Column()
    isPublished: boolean
}
```

Column types are database-specific.
You can set any column type your database supports.
More information on supported column types can be found [here](./docs/entities.md#column-types).

### Creating a new `DataSource`

Now, when our entity is created, let's create `index.ts` file and set up our `DataSource` there:

```javascript
import "reflect-metadata"
import { DataSource } from "typeorm"
import { Photo } from "./entity/Photo"

const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "root",
    password: "admin",
    database: "test",
    entities: [Photo],
    synchronize: true,
    logging: false,
})

// to initialize the initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
AppDataSource.initialize()
    .then(() => {
        // here you can start to work with your database
    })
    .catch((error) => console.log(error))
```

We are using Postgres in this example, but you can use any other supported database.
To use another database, simply change the `type` in the options to the database type you are using:
`mysql`, `mariadb`, `postgres`, or `sqlite`.
Also make sure to use your own host, port, username, password, and database settings.

We added our Photo entity to the list of entities for this data source.
Each entity you are using in your connection must be listed there.

Setting `synchronize` makes sure your entities will be synced with the database, every time you run the application.

### Running the application

Now if you run your `index.ts`, a connection with the database will be initialized and a database table for your photos will be created.

```shell
+-------------+--------------+----------------------------+
|                         photo                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(100) |                            |
| description | text         |                            |
| filename    | varchar(255) |                            |
| views       | int(11)      |                            |
| isPublished | boolean      |                            |
+-------------+--------------+----------------------------+
```

### Creating and inserting a photo into the database

Now let's create a new photo to save it in the database:

```javascript
import { Photo } from "./entity/Photo"
import { AppDataSource } from "./index"

const photo = new Photo()
photo.name = "Me and Bears"
photo.description = "I am near polar bears"
photo.filename = "photo-with-bears.jpg"
photo.views = 1
photo.isPublished = true

await AppDataSource.manager.save(photo)
console.log("Photo has been saved. Photo id is", photo.id)
```

Once your entity is saved it will get a newly generated id.
`save` method returns an instance of the same object you pass to it.
It's not a new copy of the object, it modifies its "id" and returns it.

### Using Entity Manager

We just created a new photo and saved it in the database.
We used `EntityManager` to save it.
Using entity manager you can manipulate any entity in your app.
For example, let's load our saved entity:

```javascript
import { Photo } from "./entity/Photo"
import { AppDataSource } from "./index"

const savedPhotos = await AppDataSource.manager.find(Photo)
console.log("All photos from the db: ", savedPhotos)
```

`savedPhotos` will be an array of Photo objects with the data loaded from the database.

Learn more about EntityManager [here](./docs/working-with-entity-manager.md).

### Using Repositories

Now let's refactor our code and use `Repository` instead of `EntityManager`.
Each entity has its own repository which handles all operations with its entity.
When you deal with entities a lot, Repositories are more convenient to use than EntityManagers:

```javascript
import { Photo } from "./entity/Photo"
import { AppDataSource } from "./index"

const photo = new Photo()
photo.name = "Me and Bears"
photo.description = "I am near polar bears"
photo.filename = "photo-with-bears.jpg"
photo.views = 1
photo.isPublished = true

const photoRepository = AppDataSource.getRepository(Photo)

await photoRepository.save(photo)
console.log("Photo has been saved")

const savedPhotos = await photoRepository.find()
console.log("All photos from the db: ", savedPhotos)
```

Learn more about Repository [here](./docs/working-with-repository.md).

### Loading from the database

Let's try more load operations using the Repository:

```javascript
import { Photo } from "./entity/Photo"
import { AppDataSource } from "./index"

const photoRepository = AppDataSource.getRepository(Photo)
const allPhotos = await photoRepository.find()
console.log("All photos from the db: ", allPhotos)

const firstPhoto = await photoRepository.findOneBy({
    id: 1,
})
console.log("First photo from the db: ", firstPhoto)

const meAndBearsPhoto = await photoRepository.findOneBy({
    name: "Me and Bears",
})
console.log("Me and Bears photo from the db: ", meAndBearsPhoto)

const allViewedPhotos = await photoRepository.findBy({ views: 1 })
console.log("All viewed photos: ", allViewedPhotos)

const allPublishedPhotos = await photoRepository.findBy({ isPublished: true })
console.log("All published photos: ", allPublishedPhotos)

const [photos, photosCount] = await photoRepository.findAndCount()
console.log("All photos: ", photos)
console.log("Photos count: ", photosCount)
```

### Updating in the database

Now let's load a single photo from the database, update it and save it:

```javascript
import { Photo } from "./entity/Photo"
import { AppDataSource } from "./index"

const photoRepository = AppDataSource.getRepository(Photo)
const photoToUpdate = await photoRepository.findOneBy({
    id: 1,
})
photoToUpdate.name = "Me, my friends and polar bears"
await photoRepository.save(photoToUpdate)
```

Now photo with `id = 1` will be updated in the database.

### Removing from the database

Now let's remove our photo from the database:

```javascript
import { Photo } from "./entity/Photo"
import { AppDataSource } from "./index"

const photoRepository = AppDataSource.getRepository(Photo)
const photoToRemove = await photoRepository.findOneBy({
    id: 1,
})
await photoRepository.remove(photoToRemove)
```

Now photo with `id = 1` will be removed from the database.

### Creating a one-to-one relation

Let's create a one-to-one relationship with another class.
Let's create a new class in `PhotoMetadata.ts`. This PhotoMetadata class is supposed to contain our photo's additional meta-information:

```javascript
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinColumn,
} from "typeorm"
import { Photo } from "./Photo"

@Entity()
export class PhotoMetadata {
    @PrimaryGeneratedColumn()
    id: number

    @Column("int")
    height: number

    @Column("int")
    width: number

    @Column()
    orientation: string

    @Column()
    compressed: boolean

    @Column()
    comment: string

    @OneToOne(() => Photo)
    @JoinColumn()
    photo: Photo
}
```

Here, we are using a new decorator called `@OneToOne`. It allows us to create a one-to-one relationship between two entities.
`type => Photo` is a function that returns the class of the entity with which we want to make our relationship.
We are forced to use a function that returns a class, instead of using the class directly, because of the language specifics.
We can also write it as `() => Photo`, but we use `type => Photo` as a convention to increase code readability.
The type variable itself does not contain anything.

We also add a `@JoinColumn` decorator, which indicates that this side of the relationship will own the relationship.
Relations can be unidirectional or bidirectional.
Only one side of relational can be owning.
Using `@JoinColumn` decorator is required on the owner side of the relationship.

If you run the app, you'll see a newly generated table, and it will contain a column with a foreign key for the photo relation:

```shell
+-------------+--------------+----------------------------+
|                     photo_metadata                      |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| height      | int(11)      |                            |
| width       | int(11)      |                            |
| comment     | varchar(255) |                            |
| compressed  | boolean      |                            |
| orientation | varchar(255) |                            |
| photoId     | int(11)      | FOREIGN KEY                |
+-------------+--------------+----------------------------+
```

### Save a one-to-one relation

Now let's save a photo, and its metadata and attach them to each other.

```javascript
import { Photo } from "./entity/Photo"
import { PhotoMetadata } from "./entity/PhotoMetadata"

// create a photo
const photo = new Photo()
photo.name = "Me and Bears"
photo.description = "I am near polar bears"
photo.filename = "photo-with-bears.jpg"
photo.views = 1
photo.isPublished = true

// create a photo metadata
const metadata = new PhotoMetadata()
metadata.height = 640
metadata.width = 480
metadata.compressed = true
metadata.comment = "cybershoot"
metadata.orientation = "portrait"
metadata.photo = photo // this way we connect them

// get entity repositories
const photoRepository = AppDataSource.getRepository(Photo)
const metadataRepository = AppDataSource.getRepository(PhotoMetadata)

// first we should save a photo
await photoRepository.save(photo)

// photo is saved. Now we need to save a photo metadata
await metadataRepository.save(metadata)

// done
console.log(
    "Metadata is saved, and the relation between metadata and photo is created in the database too",
)
```

### Inverse side of the relationship

Relations can be unidirectional or bidirectional.
Currently, our relation between PhotoMetadata and Photo is unidirectional.
The owner of the relation is PhotoMetadata, and Photo doesn't know anything about PhotoMetadata.
This makes it complicated to access PhotoMetadata from the Photo side.
To fix this issue we should add an inverse relation, and make relations between PhotoMetadata and Photo bidirectional.
Let's modify our entities:

```javascript
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinColumn,
} from "typeorm"
import { Photo } from "./Photo"

@Entity()
export class PhotoMetadata {
    /* ... other columns */

    @OneToOne(() => Photo, (photo) => photo.metadata)
    @JoinColumn()
    photo: Photo
}
```

```javascript
import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from "typeorm"
import { PhotoMetadata } from "./PhotoMetadata"

@Entity()
export class Photo {
    /* ... other columns */

    @OneToOne(() => PhotoMetadata, (photoMetadata) => photoMetadata.photo)
    metadata: PhotoMetadata
}
```

`photo => photo.metadata` is a function that returns the name of the inverse side of the relation.
Here we show that the metadata property of the Photo class is where we store PhotoMetadata in the Photo class.
Instead of passing a function that returns a property of the photo, you could alternatively simply pass a string to `@OneToOne` decorator, like `"metadata"`.
But we used this function-typed approach to make our refactoring easier.

Note that we should use the `@JoinColumn` decorator only on one side of a relation.
Whichever side you put this decorator on will be the owning side of the relationship.
The owning side of a relationship contains a column with a foreign key in the database.

### Relations in ESM projects

If you use ESM in your TypeScript project, you should use the `Relation` wrapper type in relation properties to avoid circular dependency issues.
Let's modify our entities:

```javascript
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinColumn,
    Relation,
} from "typeorm"
import { Photo } from "./Photo"

@Entity()
export class PhotoMetadata {
    /* ... other columns */

    @OneToOne(() => Photo, (photo) => photo.metadata)
    @JoinColumn()
    photo: Relation<Photo>
}
```

```javascript
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    Relation,
} from "typeorm"
import { PhotoMetadata } from "./PhotoMetadata"

@Entity()
export class Photo {
    /* ... other columns */

    @OneToOne(() => PhotoMetadata, (photoMetadata) => photoMetadata.photo)
    metadata: Relation<PhotoMetadata>
}
```

### Loading objects with their relations

Now let's load our photo and its photo metadata in a single query.
There are two ways to do it - using `find*` methods or using `QueryBuilder` functionality.
Let's use `find*` method first.
`find*` methods allow you to specify an object with the `FindOneOptions` / `FindManyOptions` interface.

```javascript
import { Photo } from "./entity/Photo"
import { PhotoMetadata } from "./entity/PhotoMetadata"
import { AppDataSource } from "./index"

const photoRepository = AppDataSource.getRepository(Photo)
const photos = await photoRepository.find({
    relations: {
        metadata: true,
    },
})
```

Here, photos will contain an array of photos from the database, and each photo will contain its photo metadata.
Learn more about Find Options in [this documentation](./docs/find-options.md).

Using find options is good and dead simple, but if you need a more complex query, you should use `QueryBuilder` instead.
`QueryBuilder` allows more complex queries to be used in an elegant way:

```javascript
import { Photo } from "./entity/Photo"
import { PhotoMetadata } from "./entity/PhotoMetadata"
import { AppDataSource } from "./index"

const photos = await AppDataSource.getRepository(Photo)
    .createQueryBuilder("photo")
    .innerJoinAndSelect("photo.metadata", "metadata")
    .getMany()
```

`QueryBuilder` allows the creation and execution of SQL queries of almost any complexity.
When you work with `QueryBuilder`, think like you are creating an SQL query.
In this example, "photo" and "metadata" are aliases applied to selected photos.
You use aliases to access columns and properties of the selected data.

### Using cascades to automatically save related objects

We can set up cascade options in our relations, in the cases when we want our related object to be saved whenever the other object is saved.
Let's change our photo's `@OneToOne` decorator a bit:

```javascript
export class Photo {
    // ... other columns

    @OneToOne(() => PhotoMetadata, (metadata) => metadata.photo, {
        cascade: true,
    })
    metadata: PhotoMetadata
}
```

Using `cascade` allows us not to separately save photos and separately save metadata objects now.
Now we can simply save a photo object, and the metadata object will be saved automatically because of cascade options.

```javascript
import { AppDataSource } from "./index"

// create photo object
const photo = new Photo()
photo.name = "Me and Bears"
photo.description = "I am near polar bears"
photo.filename = "photo-with-bears.jpg"
photo.isPublished = true

// create photo metadata object
const metadata = new PhotoMetadata()
metadata.height = 640
metadata.width = 480
metadata.compressed = true
metadata.comment = "cybershoot"
metadata.orientation = "portrait"

photo.metadata = metadata // this way we connect them

// get repository
const photoRepository = AppDataSource.getRepository(Photo)

// saving a photo also save the metadata
await photoRepository.save(photo)

console.log("Photo is saved, photo metadata is saved too.")
```

Notice that we now set the photo's `metadata` property, instead of the metadata's `photo` property as before. The `cascade` feature only works if you connect the photo to its metadata from the photo's side. If you set the metadata side, the metadata would not be saved automatically.

### Creating a many-to-one / one-to-many relation

Let's create a many-to-one/one-to-many relation.
Let's say a photo has one author, and each author can have many photos.
First, let's create an `Author` class:

```javascript
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
    JoinColumn,
} from "typeorm"
import { Photo } from "./Photo"

@Entity()
export class Author {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @OneToMany(() => Photo, (photo) => photo.author) // note: we will create author property in the Photo class below
    photos: Photo[]
}
```

`Author` contains an inverse side of a relation.
`OneToMany` is always an inverse side of the relation, and it can't exist without `ManyToOne` on the other side of the relation.

Now let's add the owner side of the relation into the Photo entity:

```javascript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm"
import { PhotoMetadata } from "./PhotoMetadata"
import { Author } from "./Author"

@Entity()
export class Photo {
    /* ... other columns */

    @ManyToOne(() => Author, (author) => author.photos)
    author: Author
}
```

In many-to-one / one-to-many relations, the owner side is always many-to-one.
It means that the class that uses `@ManyToOne` will store the id of the related object.

After you run the application, the ORM will create the `author` table:

```shell
+-------------+--------------+----------------------------+
|                          author                         |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(255) |                            |
+-------------+--------------+----------------------------+
```

It will also modify the `photo` table, adding a new `author` column and creating a foreign key for it:

```shell
+-------------+--------------+----------------------------+
|                         photo                           |
+-------------+--------------+----------------------------+
| id          | int(11)      | PRIMARY KEY AUTO_INCREMENT |
| name        | varchar(255) |                            |
| description | varchar(255) |                            |
| filename    | varchar(255) |                            |
| isPublished | boolean      |                            |
| authorId    | int(11)      | FOREIGN KEY                |
+-------------+--------------+----------------------------+
```

### Creating a many-to-many relation

Let's create a many-to-many relation.
Let's say a photo can be in many albums, and each album can contain many photos.
Let's create an `Album` class:

```javascript
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable,
} from "typeorm"

@Entity()
export class Album {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @ManyToMany(() => Photo, (photo) => photo.albums)
    @JoinTable()
    photos: Photo[]
}
```

`@JoinTable` is required to specify that this is the owner side of the relationship.

Now let's add the inverse side of our relation to the `Photo` class:

```javascript
export class Photo {
    // ... other columns

    @ManyToMany(() => Album, (album) => album.photos)
    albums: Album[]
}
```

After you run the application, the ORM will create a **album_photos_photo_albums** _junction table_:

```shell
+-------------+--------------+----------------------------+
|                album_photos_photo_albums                |
+-------------+--------------+----------------------------+
| album_id    | int(11)      | PRIMARY KEY FOREIGN KEY    |
| photo_id    | int(11)      | PRIMARY KEY FOREIGN KEY    |
+-------------+--------------+----------------------------+
```

Don't forget to register the `Album` class with your connection in the ORM:

```javascript
const options: DataSourceOptions = {
    // ... other options
    entities: [Photo, PhotoMetadata, Author, Album],
}
```

Now let's insert albums and photos into our database:

```javascript
import { AppDataSource } from "./index"

// create a few albums
const album1 = new Album()
album1.name = "Bears"
await AppDataSource.manager.save(album1)

const album2 = new Album()
album2.name = "Me"
await AppDataSource.manager.save(album2)

// create a few photos
const photo = new Photo()
photo.name = "Me and Bears"
photo.description = "I am near polar bears"
photo.filename = "photo-with-bears.jpg"
photo.views = 1
photo.isPublished = true
photo.albums = [album1, album2]
await AppDataSource.manager.save(photo)

// now our photo is saved and albums are attached to it
// now lets load them:
const loadedPhoto = await AppDataSource.getRepository(Photo).findOne({
    where: {
        id: 1,
    },
    relations: {
        albums: true,
    },
})
```

`loadedPhoto` will be equal to:

```javascript
{
    id: 1,
    name: "Me and Bears",
    description: "I am near polar bears",
    filename: "photo-with-bears.jpg",
    albums: [{
        id: 1,
        name: "Bears"
    }, {
        id: 2,
        name: "Me"
    }]
}
```

### Using QueryBuilder

You can use QueryBuilder to build SQL queries of almost any complexity. For example, you can do this:

```javascript
const photos = await AppDataSource.getRepository(Photo)
    .createQueryBuilder("photo") // first argument is an alias. Alias is what you are selecting - photos. You must specify it.
    .innerJoinAndSelect("photo.metadata", "metadata")
    .leftJoinAndSelect("photo.albums", "album")
    .where("photo.isPublished = true")
    .andWhere("(photo.name = :photoName OR photo.name = :bearName)")
    .orderBy("photo.id", "DESC")
    .skip(5)
    .take(10)
    .setParameters({ photoName: "My", bearName: "Mishka" })
    .getMany()
```

This query selects all published photos with "My" or "Mishka" names.
It will select results from position 5 (pagination offset)
and will select only 10 results (pagination limit).
The selection result will be ordered by id in descending order.
The photo albums will be left joined and their metadata will be inner joined.

You'll use the query builder in your application a lot.
Learn more about QueryBuilder [here](./docs/select-query-builder.md).

## Samples

Take a look at the samples in [sample](https://github.com/typeorm/typeorm/tree/master/sample) for examples of usage.

There are a few repositories that you can clone and start with:

-   [Example how to use TypeORM with TypeScript](https://github.com/typeorm/typescript-example)
-   [Example how to use TypeORM with JavaScript](https://github.com/typeorm/javascript-example)
-   [Example how to use TypeORM with JavaScript and Babel](https://github.com/typeorm/babel-example)
-   [Example how to use Express and TypeORM](https://github.com/typeorm/typescript-express-example)
-   [Example how to use Koa and TypeORM](https://github.com/typeorm/typescript-koa-example)

## Extensions

There are several extensions that simplify working with TypeORM and integrating it with other modules:

-   [TypeORM + GraphQL framework](https://github.com/vesper-framework/vesper)
-   [TypeORM integration](https://github.com/typeorm/typeorm-typedi-extensions) with [TypeDI](https://github.com/pleerock/typedi)
-   [TypeORM integration](https://github.com/typeorm/typeorm-routing-controllers-extensions) with [routing-controllers](https://github.com/pleerock/routing-controllers)
-   Models generation from the existing database - [typeorm-model-generator](https://github.com/Kononnable/typeorm-model-generator)
-   Fixtures loader - [typeorm-fixtures-cli](https://github.com/RobinCK/typeorm-fixtures)
-   ER Diagram generator - [typeorm-uml](https://github.com/eugene-manuilov/typeorm-uml/)
-   another ER Diagram generator - [erdia](https://www.npmjs.com/package/erdia/)
-   Create, drop & seed database - [typeorm-extension](https://github.com/tada5hi/typeorm-extension)
-   Automatically update `data-source.ts` after generating migrations/entities - [typeorm-codebase-sync](https://www.npmjs.com/package/typeorm-codebase-sync)
-   Easy manipulation of `relations` objects - [typeorm-relations](https://npmjs.com/package/typeorm-relations)
-   Automatically generate `relations` based on a GraphQL query - [typeorm-relations-graphql](https://npmjs.com/package/typeorm-relations-graphql)

## Contributing

Learn about contribution [here](https://github.com/typeorm/typeorm/blob/master/CONTRIBUTING.md) and how to set up your development environment [here](https://github.com/typeorm/typeorm/blob/master/DEVELOPER.md).

This project exists thanks to all the people who contribute:

<a href="https://github.com/typeorm/typeorm/graphs/contributors"><img src="https://opencollective.com/typeorm/contributors.svg?width=890&showBtn=false" /></a>

## Sponsors

Open source is hard and time-consuming. If you want to invest in TypeORM's future you can become a sponsor and allow our core team to spend more time on TypeORM's improvements and new features. [Become a sponsor](https://opencollective.com/typeorm)

<a href="https://opencollective.com/typeorm" target="_blank"><img src="https://opencollective.com/typeorm/tiers/sponsor.svg?width=890"></a>

## Gold Sponsors

Become a gold sponsor and get premium technical support from our core contributors. [Become a gold sponsor](https://opencollective.com/typeorm)

<a href="https://opencollective.com/typeorm" target="_blank"><img src="https://opencollective.com/typeorm/tiers/gold-sponsor.svg?width=890"></a>
