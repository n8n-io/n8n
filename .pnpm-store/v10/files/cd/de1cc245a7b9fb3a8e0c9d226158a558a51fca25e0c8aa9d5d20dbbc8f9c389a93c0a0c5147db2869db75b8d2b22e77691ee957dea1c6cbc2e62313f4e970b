# detective-scss

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-detective-scss/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-detective-scss/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-scss?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-scss)
[![npm downloads](https://img.shields.io/npm/dm/detective-scss)](https://www.npmjs.com/package/detective-scss)

> Find the dependencies of an scss file

```sh
npm install detective-scss
```

**Note:** This is specific to the .scss style syntax of the Sass preprocessor. For Sass support, please see [node-detective-sass](https://github.com/dependents/node-detective-sass).

It's the SASS counterpart to [detective](https://github.com/substack/node-detective), [detective-amd](https://github.com/dependents/node-detective-amd), and [detective-es6](https://github.com/dependents/node-detective-es6).

* The AST is generated using the [gonzales-pe](https://github.com/tonyganch/gonzales-pe) parser.

## Usage

```js
const fs = require('fs');
const detective = require('detective-scss');

const content = fs.readFileSync('styles.scss', 'utf8');

// list of imported file names (ex: '_foo.scss', '_foo', etc)
const dependencies = detective(content);

// or to also detect any url() references to images, fonts, etc.
const allDependencies = detective(content, { url: true });
```

### Options

* `url` (optional): (`Boolean`) also detect any `url()` references to images, fonts, etc.

## Related

* [node-sass-lookup](https://github.com/dependents/node-sass-lookup) if you want to map a sass/scss dependency to a file on your filesystem.
* [node-precinct](https://github.com/dependents/node-precinct) if you want to also support finding dependencies for JavaScript and other languages.

## License

[MIT](LICENSE)
