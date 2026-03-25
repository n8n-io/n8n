# read-package-json-fast

Like [`read-package-json`](http://npm.im/read-package-json), but faster and
more accepting of "missing" data.

This is only suitable for reading package.json files in a node_modules
tree, since it doesn't do the various cleanups, normalization, and warnings
that are beneficial at the root level in a package being published.

## USAGE

```js
const rpj = require('read-package-json-fast')

// typical promisey type API
rpj('/path/to/package.json')
  .then(data => ...)
  .catch(er => ...)

// or just normalize a package manifest
const normalized = rpj.normalize(packageJsonObject)
```

Errors raised from parsing will use
[`json-parse-even-better-errors`](http://npm.im/json-parse-even-better-errors),
so they'll be of type `JSONParseError` and have a `code: 'EJSONPARSE'`
property.  Errors will also always have a `path` member referring to the
path originally passed into the function.

## Indentation

To preserve indentation when the file is saved back to disk, use
`data[Symbol.for('indent')]` as the third argument to `JSON.stringify`, and
if you want to preserve windows `\r\n` newlines, replace the `\n` chars in
the string with `data[Symbol.for('newline')]`.

For example:

```js
const data = await readPackageJsonFast('./package.json')
const indent = Symbol.for('indent')
const newline = Symbol.for('newline')
// .. do some stuff to the data ..
const string = JSON.stringify(data, null, data[indent]) + '\n'
const eolFixed = data[newline] === '\n' ? string
  : string.replace(/\n/g, data[newline])
await writeFile('./package.json', eolFixed)
```

Indentation is determined by looking at the whitespace between the initial
`{` and the first `"` that follows it.  If you have lots of weird
inconsistent indentation, then it won't track that or give you any way to
preserve it.  Whether this is a bug or a feature is debatable ;)

## WHAT THIS MODULE DOES

- Parse JSON
- Normalize `bundledDependencies`/`bundleDependencies` naming to just
  `bundleDependencies` (without the extra `d`)
- Handle `true`, `false`, or object values passed to `bundleDependencies`
- Normalize `funding: <string>` to `funding: { url: <string> }`
- Remove any `scripts` members that are not a string value.
- Normalize a string `bin` member to `{ [name]: bin }`.
- Fold `optionalDependencies` into `dependencies`.
- Set the `_id` property if name and version are set.  (This is
  load-bearing in a few places within the npm CLI.)

## WHAT THIS MODULE DOES NOT DO

- Warn about invalid/missing name, version, repository, etc.
- Extract a description from the `README.md` file, or attach the readme to
  the parsed data object.
- Read the `HEAD` value out of the `.git` folder.
- Warn about potentially typo'ed scripts (eg, `tset` instead of `test`)
- Check to make sure that all the files in the `files` field exist and are
  valid files.
- Fix bundleDependencies that are not listed in `dependencies`.
- Fix `dependencies` fields that are not strictly objects of string values.
- Anything involving the `directories` field (ie, bins, mans, and so on).
