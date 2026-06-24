# Tree Entities

TypeORM supports the Adjacency list and Closure table patterns for storing tree structures.
To learn more about the hierarchy table take a look at [this awesome presentation by Bill Karwin](https://www.slideshare.net/billkarwin/models-for-hierarchical-data).

-   [Adjacency list](#adjacency-list)
-   [Nested set](#nested-set)
-   [Materialized Path (aka Path Enumeration)](#materialized-path-aka-path-enumeration)
-   [Closure table](#closure-table)
-   [Working with tree entities](#working-with-tree-entities)

## Adjacency list

Adjacency list is a simple model with self-referencing.
The benefit of this approach is simplicity,
a drawback is that you can't load big trees all at once because of join limitations.
To learn more about the benefits and use of Adjacency Lists look at [this article by Matthew Schinckel](http://schinckel.net/2014/09/13/long-live-adjacency-lists/).
Example:

```typescript
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    OneToMany,
} from "typeorm"

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @ManyToOne((type) => Category, (category) => category.children)
    parent: Category

    @OneToMany((type) => Category, (category) => category.parent)
    children: Category[]
}
```

## Nested set

Nested set is another pattern of storing tree structures in the database.
It is very efficient for reads, but bad for writes.
You cannot have multiple roots in the nested set.
Example:

```typescript
import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    TreeChildren,
    TreeParent,
    TreeLevelColumn,
} from "typeorm"

@Entity()
@Tree("nested-set")
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @TreeChildren()
    children: Category[]

    @TreeParent()
    parent: Category
}
```

## Materialized Path (aka Path Enumeration)

Materialized Path (also called Path Enumeration) is another pattern of storing tree structures in the database.
It is simple and effective.
Example:

```typescript
import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    TreeChildren,
    TreeParent,
    TreeLevelColumn,
} from "typeorm"

@Entity()
@Tree("materialized-path")
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @TreeChildren()
    children: Category[]

    @TreeParent()
    parent: Category
}
```

## Closure table

Closure table stores relations between parent and child in a separate table in a special way.
It's efficient in both reading and writing.
Example:

```typescript
import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    TreeChildren,
    TreeParent,
    TreeLevelColumn,
} from "typeorm"

@Entity()
@Tree("closure-table")
export class Category {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @TreeChildren()
    children: Category[]

    @TreeParent()
    parent: Category
}
```

You can specify the closure table name and/or closure table column names by setting optional parameter `options` into `@Tree("closure-table", options)`. `ancestorColumnName` and `descandantColumnName` are callback functions, which receive the primary column's metadata and return the column's name.

```ts
@Tree("closure-table", {
    closureTableName: "category_closure",
    ancestorColumnName: (column) => "ancestor_" + column.propertyName,
    descendantColumnName: (column) => "descendant_" + column.propertyName,
})
```

## Working with tree entities

To bind tree entities to each other, it is required to set the parent in the child entity and then save them.
for example:

```typescript
const a1 = new Category()
a1.name = "a1"
await dataSource.manager.save(a1)

const a11 = new Category()
a11.name = "a11"
a11.parent = a1
await dataSource.manager.save(a11)

const a12 = new Category()
a12.name = "a12"
a12.parent = a1
await dataSource.manager.save(a12)

const a111 = new Category()
a111.name = "a111"
a111.parent = a11
await dataSource.manager.save(a111)

const a112 = new Category()
a112.name = "a112"
a112.parent = a11
await dataSource.manager.save(a112)
```

To load such a tree use `TreeRepository`:

```typescript
const trees = await dataSource.manager.getTreeRepository(Category).findTrees()
```

`trees` will be the following:

```json
[
    {
        "id": 1,
        "name": "a1",
        "children": [
            {
                "id": 2,
                "name": "a11",
                "children": [
                    {
                        "id": 4,
                        "name": "a111"
                    },
                    {
                        "id": 5,
                        "name": "a112"
                    }
                ]
            },
            {
                "id": 3,
                "name": "a12"
            }
        ]
    }
]
```

There are other special methods to work with tree entities through `TreeRepository`:

-   `findTrees` - Returns all trees in the database with all their children, children of children, etc.

```typescript
const treeCategories = await dataSource.manager.getTreeRepository(Category).findTrees()
// returns root categories with sub categories inside

const treeCategoriesWithLimitedDepth = await dataSource.manager.getTreeRepository(Category).findTrees({ depth: 2 })
// returns root categories with sub categories inside, up to depth 2
```

-   `findRoots` - Roots are entities that have no ancestors. Finds them all.
    Does not load children's leaves.

```typescript
const rootCategories = await dataSource.manager.getTreeRepository(Category).findRoots()
// returns root categories without sub categories inside
```

-   `findDescendants` - Gets all children (descendants) of the given entity. Returns them all in a flat array.

```typescript
const children = await dataSource.manager.getTreeRepository(Category).findDescendants(parentCategory)
// returns all direct subcategories (without its nested categories) of a parentCategory
```

-   `findDescendantsTree` - Gets all children (descendants) of the given entity. Returns them in a tree - nested into each other.

```typescript
const childrenTree = await repository.findDescendantsTree(parentCategory)
// returns all direct subcategories (with its nested categories) of a parentCategory
const childrenTreeWithLimitedDepth = await repository.findDescendantsTree(
    parentCategory,
    { depth: 2 },
)
// returns all direct subcategories (with its nested categories) of a parentCategory, up to depth 2
```

-   `createDescendantsQueryBuilder` - Creates a query builder used to get descendants of the entities in a tree.

```typescript
const children = await repository
    .createDescendantsQueryBuilder(
        "category",
        "categoryClosure",
        parentCategory,
    )
    .andWhere("category.type = 'secondary'")
    .getMany()
```

-   `countDescendants` - Gets the number of descendants of the entity.

```typescript
const childrenCount = await dataSource.manager.getTreeRepository(Category).countDescendants(parentCategory)
```

-   `findAncestors` - Gets all parents (ancestors) of the given entity. Returns them all in a flat array.

```typescript
const parents = await repository.findAncestors(childCategory)
// returns all direct childCategory's parent categories (without "parent of parents")
```

-   `findAncestorsTree` - Gets all parents (ancestors) of the given entity. Returns them in a tree - nested into each other.

```typescript
const parentsTree = await dataSource.manager.getTreeRepository(Category).findAncestorsTree(childCategory)
// returns all direct childCategory's parent categories (with "parent of parents")
```

-   `createAncestorsQueryBuilder` - Creates a query builder used to get the ancestors of the entities in a tree.

```typescript
const parents = await repository
    .createAncestorsQueryBuilder("category", "categoryClosure", childCategory)
    .andWhere("category.type = 'secondary'")
    .getMany()
```

-   `countAncestors` - Gets the number of ancestors of the entity.

```typescript
const parentsCount = await dataSource.manager.getTreeRepository(Category).countAncestors(childCategory)
```

For the following methods, options can be passed:

-   findTrees
-   findRoots
-   findDescendants
-   findDescendantsTree
-   findAncestors
-   findAncestorsTree

The following options are available:

-   `relations` - Indicates what relations of entity should be loaded (simplified left join form).

Examples:

```typescript
const treeCategoriesWithRelations = await dataSource.manager.getTreeRepository(Category).findTrees({
    relations: ["sites"],
})
// automatically joins the sites relation

const parentsWithRelations = await dataSource.manager.getTreeRepository(Category).findAncestors(childCategory, {
    relations: ["members"],
})
// returns all direct childCategory's parent categories (without "parent of parents") and joins the 'members' relation
```
