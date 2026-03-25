# get-system-fonts

[![Travis CI build status](https://travis-ci.org/princjef/get-system-fonts.svg?branch=master)](https://travis-ci.org/princjef/get-system-fonts)
[![codecov](https://codecov.io/gh/princjef/get-system-fonts/branch/master/graph/badge.svg)](https://codecov.io/gh/princjef/get-system-fonts)
[![npm version](https://img.shields.io/npm/v/get-system-fonts.svg)](https://npmjs.org/package/get-system-fonts)

List full paths to all of the system fonts present.

```
npm install get-system-fonts
```

## Usage

```js
const getSystemFonts = require('get-system-fonts');

// In an async function...
const files = await getSystemFonts(); // ['/Library/Fonts/Georgia.ttf', ...]
```

## API

### `getSystemFonts([options]): Promise<string[]>`

Lists absolute paths to all system fonts

*NOTE: If you're using Typescript, `getSystemFonts()` is available as the 
default export.*

**Params**

 * `options` [*object*] - Options for configuring retrieval
    * `additionalFolders` [*string[]*] - Paths to additional folders to
      recursively scan for font files. Absolute paths are recommended. Default:
      `[]`
    * `extensions` [*string[]*] - List of file extensions to treat as font
      files. Default: `['ttf', 'otf', 'ttc', 'woff', 'woff2']`

## Contributing

Want to contribute to the project? Go check out the [Contribution 
Guide](CONTRIBUTING.md) for instructions to set up your development 
environment, open an issue and create a pull request.
