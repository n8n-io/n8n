# Contributing

## Adding a new plugin or polyfill to support (when approved in the next ECMAScript version)

### Update [`plugin-features.js`](https://github.com/babel/babel/blob/main/packages/babel-compat-data/scripts/data/plugin-features.js)

*Example:*

If you were going to add `**` which is in ES2016:

Find the relevant entries on [compat-table](https://kangax.github.io/compat-table/es2016plus/#test-exponentiation_(**)_operator):

`exponentiation (**) operator`

Find the corresponding babel plugin:

`@babel/plugin-transform-exponentiation-operator`

And add them in this structure:

```js
// es2016
"@babel/plugin-transform-exponentiation-operator": {
  features: [
    "exponentiation (**) operator",
  ],
},
```

### Update data for `core-js@2` polyfilling

*Example:*

In case you want to add `Object.values` which is in ES2017:

Find the relevant feature and subfeature on [compat-table](https://kangax.github.io/compat-table/es2016plus/#test-Object_static_methods_Object.values)
and split it with `/`:

`Object static methods / Object.values`

Find the corresponding module on [`core-js@2`](https://github.com/zloirock/core-js/tree/v2/modules):

`es7.object.values.js`

Find required ES version in [`corejs2-built-in-features.js`](https://github.com/babel/babel/blob/main/packages/babel-preset-env/data/corejs2-built-in-features.js) and add the new feature:

```js
const es = {
  //...
  "es7.object.values": "Object static methods / Object.values"
}
```

If you want to transform a new built-in by `useBuiltIns: 'usage'`, add mapping to related `core-js` modules to [this file](https://github.com/babel/babel/blob/main/packages/babel-preset-env/polyfills/corejs2/built-in-definitions.js).

### Update data for `core-js@3` polyfilling

Just update the version of [`core-js-compat`](https://github.com/zloirock/core-js/tree/main/packages/core-js-compat) in dependencies.

If you want to transform a new built-in by `useBuiltIns: 'usage'`, add mapping to related [`core-js`](https://github.com/zloirock/core-js/tree/main/packages/core-js/modules) modules to [this file](https://github.com/babel/babel/blob/main/packages/babel-preset-env/polyfills/corejs3/built-in-definitions.js).

If you want to mark a new proposal as shipped, add it to [this list](https://github.com/babel/babel/blob/main/packages/babel-preset-env/polyfills/corejs3/shipped-proposals.js).

### Update [`plugins.json`](https://github.com/babel/babel/blob/main/packages/babel-preset-env/data/plugins.json)

Until `compat-table` is a standalone npm module for data we are using the git commit in `packages/babel-compat-data/scripts/download-compat-table.sh`

`COMPAT_TABLE_COMMIT=[latest-commit-hash]`,

So we update and then run `npm run build-data`. If there are no changes, then `plugins.json` will be the same.

## Tests

### Running tests
See general [CONTRIBUTING.md](https://github.com/babel/babel/blob/main/CONTRIBUTING.md#running-lintingtests).

### Writing tests

#### General

All the tests for `@babel/preset-env` exist in the `test/fixtures` folder. The
test setup and conventions are exactly the same as testing a Babel plugin, so
please read our [documentation on writing tests](https://github.com/babel/babel/blob/main/CONTRIBUTING.md#babel-plugin-x).

#### Testing the `debug` option

Testing debug output to `stdout` is similar. Under the `test/debug-fixtures`,
create a folder with a descriptive name of your test, and add the following:

* Add a `options.json` file (just as the other tests, this is essentially a
`.babelrc`) with the desired test configuration (required)
* Add a `stdout.txt` file with the expected debug output. For added
convenience, if there is no `stdout.txt` present, the test runner will
generate one for you.
