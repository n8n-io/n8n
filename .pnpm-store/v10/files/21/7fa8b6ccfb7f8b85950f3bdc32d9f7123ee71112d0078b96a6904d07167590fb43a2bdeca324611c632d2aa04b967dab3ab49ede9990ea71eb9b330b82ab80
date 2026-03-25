# is-builtin-module

> Check if a string matches the name of a Node.js builtin module

Note that this matches based a [static list of modules](https://github.com/sindresorhus/builtin-modules) from the latest Node.js version. If you want to check for a module in the current Node.js, use the core [`isBuiltin`](https://nodejs.org/api/module.html#moduleisbuiltinmodulename) method.

## Install

```sh
npm install is-builtin-module
```

## Usage

```js
import isBuiltinModule from 'is-builtin-module';

isBuiltinModule('fs');
//=> true

isBuiltinModule('fs/promises');
//=> true

isBuiltinModule('node:fs/promises');
//=> true

isBuiltinModule('unicorn');
//=> false
```

## Related

- [builtin-modules](https://github.com/sindresorhus/builtin-modules) - A static list of the Node.js builtin modules from the latest Node.js version
