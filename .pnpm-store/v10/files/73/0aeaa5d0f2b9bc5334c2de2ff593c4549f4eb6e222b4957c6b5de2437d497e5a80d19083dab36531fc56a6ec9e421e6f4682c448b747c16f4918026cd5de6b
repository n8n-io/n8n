# detective-sass

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-detective-sass/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-detective-sass/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-sass?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-sass)
[![npm downloads](https://img.shields.io/npm/dm/detective-sass)](https://www.npmjs.com/package/detective-sass)

> Find the dependencies of a sass file

```sh
npm install detective-sass
```

**Note:** This is specific to the .sass style syntax of the Sass preprocessor. For SCSS support, please see [node-detective-scss](https://github.com/dependents/node-detective-scss).

It's the SASS counterpart to [detective](https://github.com/substack/node-detective), [detective-amd](https://github.com/dependents/node-detective-amd), and [detective-es6](https://github.com/dependents/node-detective-es6).

* The AST is generated using the [gonzales-pe](https://github.com/tonyganch/gonzales-pe) parser.

## Usage

```js
const fs = require('fs');
const detective = require('detective-sass');

const content = fs.readFileSync('styles.sass', 'utf8');

// list of imported file names (ex: '_foo.sass', '_foo', etc)
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
