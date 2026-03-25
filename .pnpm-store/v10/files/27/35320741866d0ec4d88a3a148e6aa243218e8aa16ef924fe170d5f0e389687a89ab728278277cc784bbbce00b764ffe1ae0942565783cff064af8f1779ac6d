## TypeScript for pg-promise

Complete TypeScript declarations for [pg-promise].

### Inclusion

Typescript should be able to pick up the definitions without any manual configuration.

### Simple Usage

```ts
import pgPromise from 'pg-promise';

const pgp = pgPromise({/* Initialization Options */});

const db = pgp('postgres://username:password@host:port/database');

const {value} = await db.one('SELECT 123 as value');
```

#### With Extensions

The library supports dynamic protocol extensions, via event [extend], which requires
explicit extension interface to be declared and parameterized, as shown below.

```ts
import * as pgPromise from 'pg-promise';

// your protocol extensions:
interface IExtensions {
    findUser(userId: number): Promise<any>;
}

// pg-promise initialization options:
const options: pgPromise.IInitOptions<IExtensions> = {
    extend(obj) {
        obj.findUser = userId => {
            return obj.one('SELECT * FROM Users WHERE id = $1', [userId]);
        }
    }
};

// initializing the library:
const pgp = pgPromise(options);

// database object:
const db = pgp('postgres://username:password@host:port/database');

// protocol is extended on each level:
const user = await db.findUser(123);

// ...including inside tasks and transactions:
await db.task(async t => {
    const user = await t.findUser(123);
    // ...etc
});
```

For a comprehensive example, check out [pg-promise-demo].

[pg-promise-demo]:https://github.com/vitaly-t/pg-promise-demo
[extend]:https://vitaly-t.github.io/pg-promise/global.html#event:extend
[pg-promise]:https://github.com/vitaly-t/pg-promise
