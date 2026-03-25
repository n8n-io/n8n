#### 3.1.0

- Add support for Node.js ESM loader

#### 3.0.0

- Add ESM `module` for bundlers
- Add `typings` for Typescript
- Add `fileSystem` option support
- Add `concurrency` option support
- When `recursive` is `false`, we now return the list of directories at last level
- **WARNING**: Function call signature has been updated. Please look at README for more info.

```js
// From:
scandir(__dirname, false)
// To:
scandir(__dirname, { recursive: false })

// From:
scandir(__dirname, false, path => {
  return false
})
// To:
scandir(__dirname, { concurrency: false, validate(path) {
  return false
}})
```

#### 2.0.0

- Change CJS export to ES Export
- Return directories along with files

#### 1.0.0

- Initial release
