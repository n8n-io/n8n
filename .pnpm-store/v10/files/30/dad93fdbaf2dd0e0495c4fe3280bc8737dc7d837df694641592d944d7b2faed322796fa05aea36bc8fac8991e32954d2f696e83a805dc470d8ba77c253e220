# import-fresh

> Import a module while bypassing the [cache](https://nodejs.org/api/modules.html#modules_caching)

Useful for testing purposes when you need to freshly import a module.

## Install

```
$ npm install import-fresh
```

## Usage

```js
// foo.js
let i = 0;
module.exports = () => ++i;
```

```js
const importFresh = require('import-fresh');

require('./foo')();
//=> 1

require('./foo')();
//=> 2

importFresh('./foo')();
//=> 1

importFresh('./foo')();
//=> 1
```

## import-fresh for enterprise

Available as part of the Tidelift Subscription.

The maintainers of import-fresh and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-import-fresh?utm_source=npm-import-fresh&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

## Related

- [clear-module](https://github.com/sindresorhus/clear-module) - Clear a module from the import cache
- [import-from](https://github.com/sindresorhus/import-from) - Import a module from a given path
- [import-cwd](https://github.com/sindresorhus/import-cwd) - Import a module from the current working directory
- [import-lazy](https://github.com/sindresorhus/import-lazy) - Import modules lazily
