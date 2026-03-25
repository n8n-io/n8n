# get-package-type [![NPM Version][npm-image]][npm-url]

Determine the `package.json#type` which applies to a location.

## Usage

```js
const getPackageType = require('get-package-type');

(async () => {
  console.log(await getPackageType('file.js'));
  console.log(getPackageType.sync('file.js'));
})();
```

This function does not validate the value found in `package.json#type`.  Any truthy value
found will be returned.  Non-truthy values will be reported as `commonjs`.

The argument must be a filename.
```js
// This never looks at `dir1/`, first attempts to load `./package.json`.
const type1 = await getPackageType('dir1/');

// This attempts to load `dir1/package.json`.
const type2 = await getPackageType('dir1/index.cjs');
```

The extension of the filename does not effect the result.  The primary use case for this
module is to determine if `myapp.config.js` should be loaded with `require` or `import`.

[npm-image]: https://img.shields.io/npm/v/get-package-type.svg
[npm-url]: https://npmjs.org/package/get-package-type
