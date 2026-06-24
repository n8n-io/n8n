# Separating Entity Definition

-   [Defining Schemas](#defining-schemas)
-   [Extending Schemas](#extending-schemas)
-   [Using Schemas](#using-schemas-to-query--insert-data)

## Defining Schemas

You can define an entity and its columns right in the model, using decorators.
But some people prefer to define an entity and its columns inside separate files
which are called "entity schemas" in TypeORM.

Simple definition example:

```ts
import { EntitySchema } from "typeorm"

export const CategoryEntity = new EntitySchema({
    name: "category",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true,
        },
        name: {
            type: String,
        },
    },
})
```

Example with relations:

```ts
import { EntitySchema } from "typeorm"

export const PostEntity = new EntitySchema({
    name: "post",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true,
        },
        title: {
            type: String,
        },
        text: {
            type: String,
        },
    },
    relations: {
        categories: {
            type: "many-to-many",
            target: "category", // CategoryEntity
        },
    },
})
```

Complex example:

```ts
import { EntitySchema } from "typeorm"

export const PersonSchema = new EntitySchema({
    name: "person",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: "increment",
        },
        firstName: {
            type: String,
            length: 30,
        },
        lastName: {
            type: String,
            length: 50,
            nullable: false,
        },
        age: {
            type: Number,
            nullable: false,
        },
    },
    checks: [
        { expression: `"firstName" <> 'John' AND "lastName" <> 'Doe'` },
        { expression: `"age" > 18` },
    ],
    indices: [
        {
            name: "IDX_TEST",
            unique: true,
            columns: ["firstName", "lastName"],
        },
    ],
    uniques: [
        {
            name: "UNIQUE_TEST",
            columns: ["firstName", "lastName"],
        },
    ],
})
```

If you want to make your entity typesafe, you can define a model and specify it in schema definition:

```ts
import { EntitySchema } from "typeorm"

export interface Category {
    id: number
    name: string
}

export const CategoryEntity = new EntitySchema<Category>({
    name: "category",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true,
        },
        name: {
            type: String,
        },
    },
})
```

## Extending Schemas

When using the `Decorator` approach it is easy to `extend` basic columns to an abstract class and simply extend this.
For example, your `id`, `createdAt` and `updatedAt` columns may be defined in such a `BaseEntity`. For more details, see
the documentation on [concrete table inheritance](entity-inheritance.md#concrete-table-inheritance).

When using the `EntitySchema` approach, this is not possible. However, you can use the `Spread Operator` (`...`) to your
advantage.

Reconsider the `Category` example from above. You may want to `extract` basic column descriptions and reuse it across
your other schemas. This may be done in the following way:

```ts
import { EntitySchemaColumnOptions } from "typeorm"

export const BaseColumnSchemaPart = {
    id: {
        type: Number,
        primary: true,
        generated: true,
    } as EntitySchemaColumnOptions,
    createdAt: {
        name: "created_at",
        type: "timestamp with time zone",
        createDate: true,
    } as EntitySchemaColumnOptions,
    updatedAt: {
        name: "updated_at",
        type: "timestamp with time zone",
        updateDate: true,
    } as EntitySchemaColumnOptions,
}
```

Now you can use the `BaseColumnSchemaPart` in your other schema models, like this:

```ts
export const CategoryEntity = new EntitySchema<Category>({
    name: "category",
    columns: {
        ...BaseColumnSchemaPart,
        // the CategoryEntity now has the defined id, createdAt, updatedAt columns!
        // in addition, the following NEW fields are defined
        name: {
            type: String,
        },
    },
})
```

You can use embedded entities in schema models, like this:

```ts
export interface Name {
    first: string
    last: string
}

export const NameEntitySchema = new EntitySchema<Name>({
    name: "name",
    columns: {
        first: {
            type: "varchar",
        },
        last: {
            type: "varchar",
        },
    },
})

export interface User {
    id: string
    name: Name
    isActive: boolean
}

export const UserEntitySchema = new EntitySchema<User>({
    name: "user",
    columns: {
        id: {
            primary: true,
            generated: "uuid",
            type: "uuid",
        },
        isActive: {
            type: "boolean",
        },
    },
    embeddeds: {
        name: {
            schema: NameEntitySchema,
            prefix: "name_",
        },
    },
})
```

Be sure to add the `extended` columns also to the `Category` interface (e.g., via `export interface Category extend BaseEntity`).

### Single Table Inheritance

In order to use [Single Table Inheritance](entity-inheritance.md#single-table-inheritance):

1. Add the `inheritance` option to the **parent** class schema, specifying the inheritance pattern ("STI") and the
   **discriminator** column, which will store the name of the *child* class on each row
2. Set the `type: "entity-child"` option for all **children** classes' schemas, while extending the *parent* class
   columns using the spread operator syntax described above

```ts
// entity.ts

export abstract class Base {
    id!: number
    type!: string
    createdAt!: Date
    updatedAt!: Date
}

export class A extends Base {
    constructor(public a: boolean) {
        super()
    }
}

export class B extends Base {
    constructor(public b: number) {
        super()
    }
}

export class C extends Base {
    constructor(public c: string) {
        super()
    }
}
```

```ts
// schema.ts

const BaseSchema = new EntitySchema<Base>({
    target: Base,
    name: "Base",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: "increment",
        },
        type: {
            type: String,
        },
        createdAt: {
            type: Date,
            createDate: true,
        },
        updatedAt: {
            type: Date,
            updateDate: true,
        },
    },
    // NEW: Inheritance options
    inheritance: {
        pattern: "STI",
        column: "type",
    },
})

const ASchema = new EntitySchema<A>({
    target: A,
    name: "A",
    type: "entity-child",
    // When saving instances of 'A', the "type" column will have the value
    // specified on the 'discriminatorValue' property
    discriminatorValue: "my-custom-discriminator-value-for-A",
    columns: {
        ...BaseSchema.options.columns,
        a: {
            type: Boolean,
        },
    },
})

const BSchema = new EntitySchema<B>({
    target: B,
    name: "B",
    type: "entity-child",
    discriminatorValue: undefined, // Defaults to the class name (e.g. "B")
    columns: {
        ...BaseSchema.options.columns,
        b: {
            type: Number,
        },
    },
})

const CSchema = new EntitySchema<C>({
    target: C,
    name: "C",
    type: "entity-child",
    discriminatorValue: "my-custom-discriminator-value-for-C",
    columns: {
        ...BaseSchema.options.columns,
        c: {
            type: String,
        },
    },
})
```

## Using Schemas to Query / Insert Data

Of course, you can use the defined schemas in your repositories or entity manager as you would use the decorators.
Consider the previously defined `Category` example (with its `Interface` and `CategoryEntity` schema) in order to get
some data or manipulate the database.

```ts
// request data
const categoryRepository = dataSource.getRepository<Category>(CategoryEntity)
const category = await categoryRepository.findOneBy({
    id: 1,
}) // category is properly typed!

// insert a new category into the database
const categoryDTO = {
    // note that the ID is autogenerated; see the schema above
    name: "new category",
}
const newCategory = await categoryRepository.save(categoryDTO)
```
