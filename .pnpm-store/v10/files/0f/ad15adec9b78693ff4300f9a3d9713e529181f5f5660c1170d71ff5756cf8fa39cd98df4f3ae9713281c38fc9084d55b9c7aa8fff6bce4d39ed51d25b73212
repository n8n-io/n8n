## TypeScript for pg-minify

Complete TypeScript 5.x (`strict` mode) declarations for the module.

### Inclusion

Typescript picks up the definitions without any manual configuration.

### Usage

```ts
import * as minify from 'pg-minify';

const sql = 'SELECT 1; -- comments';

minify(sql); //=> SELECT 1;
```

And if you are using `"allowSyntheticDefaultImports": true` in your `tsconfig.json`,
then you can include it like this:

```ts
import minify from 'pg-minify';
```

[pg-minify]:https://github.com/vitaly-t/pg-minify
