# Using with JavaScript

TypeORM can be used not only with TypeScript, but also with JavaScript.
Everything is the same, except you need to omit types and if your platform does not support ES6 classes then you need to define objects with all required metadata.

##### app.js

```typescript
var typeorm = require("typeorm")

var dataSource = new typeorm.DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "test",
    password: "admin",
    database: "test",
    synchronize: true,
    entities: [require("./entity/Post"), require("./entity/Category")],
})

dataSource
    .initialize()
    .then(function () {
        var category1 = {
            name: "TypeScript",
        }
        var category2 = {
            name: "Programming",
        }

        var post = {
            title: "Control flow based type analysis",
            text: "TypeScript 2.0 implements a control flow-based type analysis for local variables and parameters.",
            categories: [category1, category2],
        }

        var postRepository = dataSource.getRepository("Post")
        postRepository
            .save(post)
            .then(function (savedPost) {
                console.log("Post has been saved: ", savedPost)
                console.log("Now lets load all posts: ")

                return postRepository.find()
            })
            .then(function (allPosts) {
                console.log("All posts: ", allPosts)
            })
    })
    .catch(function (error) {
        console.log("Error: ", error)
    })
```

##### entity/Category.js

```typescript
var EntitySchema = require("typeorm").EntitySchema

module.exports = new EntitySchema({
    name: "Category", // Will use table name `category` as default behaviour.
    tableName: "categories", // Optional: Provide `tableName` property to override the default behaviour for table name.
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        name: {
            type: "varchar",
        },
    },
})
```

##### entity/Post.js

```typescript
var EntitySchema = require("typeorm").EntitySchema

module.exports = new EntitySchema({
    name: "Post", // Will use table name `post` as default behaviour.
    tableName: "posts", // Optional: Provide `tableName` property to override the default behaviour for table name.
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        title: {
            type: "varchar",
        },
        text: {
            type: "text",
        },
    },
    relations: {
        categories: {
            target: "Category",
            type: "many-to-many",
            joinTable: true,
            cascade: true,
        },
    },
})
```

You can check out this example [typeorm/javascript-example](https://github.com/typeorm/javascript-example) to learn more.
