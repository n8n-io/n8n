# Example using TypeORM with Express

-   [Initial setup](#initial-setup)
-   [Adding Express to the application](#adding-express-to-the-application)
-   [Adding TypeORM to the application](#adding-typeorm-to-the-application)

## Initial setup

Let's create a simple application called "user" which stores users in the database
and allows us to create, update, remove, and get a list of all users, as well as a single user by id
within web api.

First, create a directory called "user":

```
mkdir user
```

Then switch to the directory and create a new project:

```
cd user
npm init
```

Finish the init process by filling in all required application information.

Now we need to install and setup a TypeScript compiler. Lets install it first:

```
npm i typescript --save-dev
```

Then let's create a `tsconfig.json` file which contains the configuration required for the application to
compile and run. Create it using your favorite editor and put the following configuration:

```json
{
    "compilerOptions": {
        "lib": ["es5", "es6", "dom"],
        "target": "es5",
        "module": "commonjs",
        "moduleResolution": "node",
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true
    }
}
```

Now let's create a main application endpoint - `app.ts` inside the `src` directory:

```
mkdir src
cd src
touch app.ts
```

Let's add a simple `console.log` inside it:

```typescript
console.log("Application is up and running")
```

Now it's time to run our application.
To run it, you need to compile your typescript project first:

```
tsc
```

Once you compile it, you should have a `src/app.js` file generated.
You can run it using:

```
node src/app.js
```

You should see the, "Application is up and running" message in your console right after you run the application.

You must compile your files each time you make a change.
Alternatively, you can set up watcher or install [ts-node](https://github.com/TypeStrong/ts-node) to avoid manual compilation each time.

## Adding Express to the application

Let's add Express to our application. First, let's install the packages we need:

```
npm i express  @types/express --save
```

-   `express` is the express engine itself. It allows us to create a web api
-   `@types/express` is used to have a type information when using express

Let's edit the `src/app.ts` file and add express-related logic:

```typescript
import * as express from "express"
import { Request, Response } from "express"

// create and setup express app
const app = express()
app.use(express.json())

// register routes

app.get("/users", function (req: Request, res: Response) {
    // here we will have logic to return all users
})

app.get("/users/:id", function (req: Request, res: Response) {
    // here we will have logic to return user by id
})

app.post("/users", function (req: Request, res: Response) {
    // here we will have logic to save a user
})

app.put("/users/:id", function (req: Request, res: Response) {
    // here we will have logic to update a user by a given user id
})

app.delete("/users/:id", function (req: Request, res: Response) {
    // here we will have logic to delete a user by a given user id
})

// start express server
app.listen(3000)
```

Now you can compile and run your project.
You should have an express server running now with working routes.
However, those routes do not return any content yet.

## Adding TypeORM to the application

Finally, let's add TypeORM to the application.
In this example, we will use `mysql` driver.
Setup process for other drivers is similar.

Let's install the required packages first:

```
npm i typeorm mysql reflect-metadata --save
```

-   `typeorm` is the typeorm package itself
-   `mysql` is the underlying database driver.
    If you are using a different database system, you must install the appropriate package
-   `reflect-metadata` is required to make decorators to work properly

Let's create `app-data-source.ts` where we set up initial database connection options:

```ts
import { DataSource } from "typeorm"

export const myDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    entities: ["src/entity/*.js"],
    logging: true,
    synchronize: true,
})
```

Configure each option as you need.
Learn more about options [here](./data-source-options.md).

Let's create a `user.entity.ts` entity inside `src/entity`:

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    firstName: string

    @Column()
    lastName: string
}
```

Let's change `src/app.ts` to establish database connection and start using `myDataSource`:

```typescript
import * as express from "express"
import { Request, Response } from "express"
import { User } from "./entity/User"
import { myDataSource } from "./app-data-source.ts"

// establish database connection
myDataSource
    .initialize()
    .then(() => {
        console.log("Data Source has been initialized!")
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })

// create and setup express app
const app = express()
app.use(express.json())

// register routes
app.get("/users", async function (req: Request, res: Response) {
    const users = await myDataSource.getRepository(User).find()
    res.json(users)
})

app.get("/users/:id", async function (req: Request, res: Response) {
    const results = await myDataSource.getRepository(User).findOneBy({
        id: req.params.id,
    })
    return res.send(results)
})

app.post("/users", async function (req: Request, res: Response) {
    const user = await myDataSource.getRepository(User).create(req.body)
    const results = await myDataSource.getRepository(User).save(user)
    return res.send(results)
})

app.put("/users/:id", async function (req: Request, res: Response) {
    const user = await myDataSource.getRepository(User).findOneBy({
        id: req.params.id,
    })
    myDataSource.getRepository(User).merge(user, req.body)
    const results = await myDataSource.getRepository(User).save(user)
    return res.send(results)
})

app.delete("/users/:id", async function (req: Request, res: Response) {
    const results = await myDataSource.getRepository(User).delete(req.params.id)
    return res.send(results)
})

// start express server
app.listen(3000)
```

Now you should have a basic express application connected to MySQL database up and running.
