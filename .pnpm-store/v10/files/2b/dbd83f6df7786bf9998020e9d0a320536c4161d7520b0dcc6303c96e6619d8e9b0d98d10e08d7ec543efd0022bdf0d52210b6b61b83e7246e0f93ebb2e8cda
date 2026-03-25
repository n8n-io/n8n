# @quansync/fs [![npm](https://img.shields.io/npm/v/@quansync/fs.svg)](https://npmjs.com/package/@quansync/fs)

[![Unit Test](https://github.com/quansync-dev/fs/actions/workflows/unit-test.yml/badge.svg)](https://github.com/quansync-dev/fs/actions/workflows/unit-test.yml)

Filesystem utilities for [quansync](https://github.com/quansync-dev/quansync).

## Install

```bash
npm i @quansync/fs
```

## Usage

```ts
import { readFile } from '@quansync/fs'
import { quansync } from 'quansync'

const resultAsync = await readFile('/path', 'utf8')
const resultSync = readFile.sync('/path', 'utf8')

const readFileTrimmed = quansync(function* (id: string) {
  const text = yield* readFile(id, 'utf8').trim()
  return text
})
const readFileTrimmedSync = readFileTrimmed.sync
```

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2025 [三咲智子 Kevin Deng](https://github.com/sxzz)
