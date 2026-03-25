# ScanDir

`sb-scandir` is a node module that supports simple file scanning with some sugar features.

## Installation

```
npm install --save sb-scandir
```

## API

```js
interface Result {
  files: Array<string>
  directories: Array<string>
}

interface FileSystem {
  join(pathA: string, pathB: string): string
  basename(path: string): string
  stat(path: string): Promise<fs.Stats>
  readdir(path: string): Promise<string[]>
}

type Validate = (path: string) => boolean

export const defaultFilesystem: FileSystem;

export default async function scanDirectory(
  path: string,
  {
    recursive = true,
    validate = null,
    concurrency = Infinity,
    fileSystem = defaultFilesystem,
  }: {
    recursive?: boolean
    validate?: Validate | null
    concurrency?: number
    fileSystem?: Partial<FileSystem>
  } = {},
): Promise<Result>;
```

## Examples

```js
import Path from 'path'
import scandir, { defaultFilesystem } from 'sb-scandir'
// or
const { default: scandir, defaultFilesystem } = require('sb-scandir')

// Scan all files except the dot ones
scandir(__dirname).then(function(result) {
  console.log('files', result.files)
  console.log('directories', result.directories)
})

// Scan all top level files except dot ones
scandir(__dirname, { recursive: false }).then(function(files) {
  console.log('files', result.files)
  console.log('directories', result.directories)
})

// Scan all files even the dot ones
scandir(__dirname, { recursive: true, validate(path) {
  return true
}}).then(function(files) {
  console.log('files', result.files)
  console.log('directories', result.directories)
})

// Scan all files except in .git and node_modules
scandir(__dirname, { recursive: true, validate(path) {
  const baseName = Path.basename(path)
  return baseName !== '.git' && baseName !== 'node_modules'
}}).then(function(files) {
  console.log('files', result.files)
  console.log('directories', result.directories)
})
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file for more info.
