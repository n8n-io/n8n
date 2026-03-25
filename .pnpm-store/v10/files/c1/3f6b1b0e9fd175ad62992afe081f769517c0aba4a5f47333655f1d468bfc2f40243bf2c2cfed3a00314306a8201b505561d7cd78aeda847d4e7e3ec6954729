## 6.0.0
From version 6.0.0 onwards, replace in file requires Node 10 or higher. If you need support for Node 8, please use version 5.x.x.

## 5.0.0
From version 5.0.0 onwards, replace in file requires Node 8 or higher. If you need support for Node 6, please use version 4.x.x.

## 4.0.0

### Breaking changes
The return value is now a results array instead of an array with changed files. The new results array includes each file that was processed, with a flag to indicate whether or not the file was changed, and optionally information about the number of matches and replacements that were made. See the readme for more details.

To update existing code and obtain an array of changed files again, simply convert the results array as follows:

```js
const results = await replace(options);
const changedFiles = results
  .filter(result => result.hasChanged)
  .map(result => result.file);
```

### New features
- Added `countMatches` flag to count the number of matches and replacements per file [#38](https://github.com/adamreisnz/replace-in-file/issues/38), [#42](https://github.com/adamreisnz/replace-in-file/issues/42), [#61](https://github.com/adamreisnz/replace-in-file/issues/61)
- Added `--quiet` flag for CLI to suppress success output [#63](https://github.com/adamreisnz/replace-in-file/issues/63)
- Added `cwd` configuration parameter for network drive replacements [#56](https://github.com/adamreisnz/replace-in-file/issues/56)

## 3.0.0

### Breaking changes
From version 3.0.0 onwards, replace in file requires Node 6 or higher. If you need support for Node 4 or 5, please use version 2.x.x.
