# compare-versions

[![Build Status](https://github.com/omichelsen/compare-versions/actions/workflows/ci.yml/badge.svg)](https://github.com/omichelsen/compare-versions/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/omichelsen/compare-versions/badge.svg?branch=main&service=github)](https://coveralls.io/github/omichelsen/compare-versions?branch=main)
[![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/compare-versions.svg)](https://bundlephobia.com/package/compare-versions)

Compare [semver](https://semver.org/) version strings to find greater, equal or lesser. Runs in the browser as well as Node.js/React Native etc. Has no dependencies and is [tiny](https://bundlephobia.com/package/compare-versions).

Supports the full semver specification including versions with different number of digits like `1.0.0`, `1.0`, `1` and pre-releases like `1.0.0-alpha`. Additionally supports the following variations:

- Wildcards for minor and patch version like `1.0.x` or `1.0.*`.
- [Chromium version numbers](https://www.chromium.org/developers/version-numbers) with 4 parts, e.g. version `25.0.1364.126`.
- Any leading `v` is ignored, e.g. `v1.0` is interpreted as `1.0`.
- Leading zero is ignored, e.g. `1.01.1` is interpreted as `1.1.1`.
- [npm version ranges](https://docs.npmjs.com/cli/v6/using-npm/semver#ranges), e.g. `1.2.7 || >=1.2.9 <2.0.0`

## Install

```bash
$ npm install compare-versions
```

__Note__: Starting from v5 the main export is now _named_ like so: `import { compareVersions } from 'compare-versions'`.

__Note__: Starting from v4 this library includes a ESM version which will automatically be selected by your bundler (webpack, parcel etc). The CJS/UMD version is `lib/umd/index.js` and the new ESM version is `lib/esm/index.js`.

## Usage

Will return `1` if first version is greater, `0` if versions are equal, and `-1` if the second version is greater:

```js
import { compareVersions } from 'compare-versions';

compareVersions('11.1.1', '10.0.0'); //  1
compareVersions('10.0.0', '10.0.0'); //  0
compareVersions('10.0.0', '11.1.1'); // -1
```

Can also be used for sorting:

```js
const versions = [
  '1.5.19',
  '1.2.3',
  '1.5.5'
]
const sorted = versions.sort(compareVersions);
/*
[
  '1.2.3',
  '1.5.5',
  '1.5.19'
]
*/
```

### "Human Readable" Compare

The alternative `compare` function accepts an operator which will be more familiar to humans:

```js
import { compare } from 'compare-versions';

compare('10.1.8', '10.0.4', '>');  // true
compare('10.0.1', '10.0.1', '=');  // true
compare('10.1.1', '10.2.2', '<');  // true
compare('10.1.1', '10.2.2', '<='); // true
compare('10.1.1', '10.2.2', '>='); // false
```

### Version ranges

The `satisfies` function accepts a range to compare, compatible with [npm package versioning](https://docs.npmjs.com/cli/v6/using-npm/semver):

```js
import { satisfies } from 'compare-versions';

satisfies('10.0.1', '~10.0.0');  // true
satisfies('10.1.0', '~10.0.0');  // false
satisfies('10.1.2', '^10.0.0');  // true
satisfies('11.0.0', '^10.0.0');  // false
satisfies('10.1.8', '>10.0.4');  // true
satisfies('10.0.1', '=10.0.1');  // true
satisfies('10.1.1', '<10.2.2');  // true
satisfies('10.1.1', '<=10.2.2'); // true
satisfies('10.1.1', '>=10.2.2'); // false
satisfies('1.4.6', '1.2.7 || >=1.2.9 <2.0.0'); // true
satisfies('1.2.8', '1.2.7 || >=1.2.9 <2.0.0'); // false
satisfies('1.5.1', '1.2.3 - 2.3.4'); // true
satisfies('2.3.5', '1.2.3 - 2.3.4'); // false
```

### Validate version numbers

Applies the same rules used comparing version numbers and returns a boolean:

```js
import { validate } from 'compare-versions';

validate('1.0.0-rc.1'); // true
validate('1.0-rc.1');   // false
validate('foo');        // false
```

### Validate version numbers (strict)

Validate version numbers strictly according to semver.org; 3 integers, no wildcards, no leading zero or "v" etc:

```js
import { validateStrict } from 'compare-versions';

validate('1.0.0');      // true
validate('1.0.0-rc.1'); // true
validate('1.0');        // false
validate('1.x');        // false
validate('v1.02');      // false
```

### Browser

If included directly in the browser, the functions above are available on the global window under the `compareVersions` object:

```html
<script src=https://unpkg.com/compare-versions/lib/umd/index.js></script>
<script>
  const { compareVersions, compare, satisfies, validate } = window.compareVersions
  console.log(compareVersions('11.0.0', '10.0.0'))
  console.log(compare('11.0.0', '10.0.0', '>'))
  console.log(satisfies('1.2.0', '^1.0.0'))
  console.log(validate('11.0.0'))
  console.log(validateStrict('11.0.0'))
</script>
```
