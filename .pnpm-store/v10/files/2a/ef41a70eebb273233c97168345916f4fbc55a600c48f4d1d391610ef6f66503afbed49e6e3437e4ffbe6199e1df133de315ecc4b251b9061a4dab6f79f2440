# @npmcli/move-file

A fork of [move-file](https://github.com/sindresorhus/move-file) with
compatibility with all node 10.x versions.

> Move a file (or directory)

The built-in
[`fs.rename()`](https://nodejs.org/api/fs.html#fs_fs_rename_oldpath_newpath_callback)
is just a JavaScript wrapper for the C `rename(2)` function, which doesn't
support moving files across partitions or devices. This module is what you
would have expected `fs.rename()` to be.

## Highlights

- Promise API.
- Supports moving a file across partitions and devices.
- Optionally prevent overwriting an existing file.
- Creates non-existent destination directories for you.
- Support for Node versions that lack built-in recursive `fs.mkdir()`
- Automatically recurses when source is a directory.

## Install

```
$ npm install @npmcli/move-file
```

## Usage

```js
const moveFile = require('@npmcli/move-file');

(async () => {
	await moveFile('source/unicorn.png', 'destination/unicorn.png');
	console.log('The file has been moved');
})();
```

## API

### moveFile(source, destination, options?)

Returns a `Promise` that resolves when the file has been moved.

### moveFile.sync(source, destination, options?)

#### source

Type: `string`

File, or directory, you want to move.

#### destination

Type: `string`

Where you want the file or directory moved.

#### options

Type: `object`

##### overwrite

Type: `boolean`\
Default: `true`

Overwrite existing destination file(s).
