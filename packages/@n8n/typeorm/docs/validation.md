# Using Validation

To use validation use [class-validator](https://github.com/pleerock/class-validator).
Example how to use class-validator with TypeORM:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import {
    Contains,
    IsInt,
    Length,
    IsEmail,
    IsFQDN,
    IsDate,
    Min,
    Max,
} from "class-validator"

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    @Length(10, 20)
    title: string

    @Column()
    @Contains("hello")
    text: string

    @Column()
    @IsInt()
    @Min(0)
    @Max(10)
    rating: number

    @Column()
    @IsEmail()
    email: string

    @Column()
    @IsFQDN()
    site: string

    @Column()
    @IsDate()
    createDate: Date
}
```

Validation:

```typescript
import { validate } from "class-validator"

let post = new Post()
post.title = "Hello" // should not pass
post.text = "this is a great post about hell world" // should not pass
post.rating = 11 // should not pass
post.email = "google.com" // should not pass
post.site = "googlecom" // should not pass

const errors = await validate(post)
if (errors.length > 0) {
    throw new Error(`Validation failed!`)
} else {
    await dataSource.manager.save(post)
}
```
