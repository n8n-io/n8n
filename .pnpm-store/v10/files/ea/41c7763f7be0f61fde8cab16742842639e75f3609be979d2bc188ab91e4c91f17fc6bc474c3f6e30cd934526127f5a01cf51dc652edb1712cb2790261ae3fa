# find-up-simple

> Find a file or directory by walking up parent directories

This is a simpler version of my [`find-up`](https://github.com/sindresorhus/find-up) package, now with zero dependencies.

## Install

```sh
npm install find-up-simple
```

## Usage

```
/
└── Users
    └── sindresorhus
        ├── unicorn.png
        └── foo
            └── bar
                ├── baz
                └── example.js
```

`example.js`

```js
import {findUp} from 'find-up-simple';

console.log(await findUp('unicorn.png'));
//=> '/Users/sindresorhus/unicorn.png'
```

## API

### findUp(name, options?)

Returns a `Promise` for the found path or `undefined` if it could not be found.

### findUpSync(name, options?)

Returns the found path or `undefined` if it could not be found.

#### name

Type: `string`

The name of the file or directory to find.

#### options

Type: `object`

##### cwd

Type: `URL | string`\
Default: `process.cwd()`

The directory to start from.

##### type

Type: `string`\
Default: `'file'`\
Values: `'file' | 'directory'`

The type of path to match.

##### stopAt

Type: `URL | string`\
Default: Root directory

The last directory to search before stopping.

## FAQ

### How is it different from [`find-up`](https://github.com/sindresorhus/find-up)?

- No support for multiple input names
- No support for finding multiple paths
- No custom matching
- No symlink option
- Zero dependencies

## Related

- [find-up](https://github.com/sindresorhus/find-up) - A more advanced version of this package
- [find-up-cli](https://github.com/sindresorhus/find-up-cli) - CLI for this module
- [package-up](https://github.com/sindresorhus/package-up) - Find the closest package.json file
- [pkg-dir](https://github.com/sindresorhus/pkg-dir) - Find the root directory of an npm package
