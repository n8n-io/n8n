# jsonrepair

Repair invalid JSON documents.

Try it out in a minimal demo: https://josdejong.github.io/jsonrepair/

Use it in a full-fledged application: https://jsoneditoronline.org

Read the background article ["How to fix JSON and validate it with ease"](https://jsoneditoronline.org/indepth/parse/fix-json/)

The following issues can be fixed:

- Add missing quotes around keys
- Add missing escape characters
- Add missing commas
- Add missing closing brackets
- Repair truncated JSON
- Replace single quotes with double quotes
- Replace special quote characters like `“...”`  with regular double quotes
- Replace special white space characters with regular spaces
- Replace Python constants `None`, `True`, and `False` with `null`, `true`, and `false`
- Strip trailing commas
- Strip comments like `/* ... */` and `// ...`
- Strip fenced code blocks like `` ```json`` and `` ``` ``
- Strip ellipsis in arrays and objects like `[1, 2, 3, ...]`
- Strip JSONP notation like `callback({ ... })`
- Strip escape characters from an escaped string like `{\"stringified\": \"content\"}`
- Strip MongoDB data types like `NumberLong(2)` and `ISODate("2012-12-19T06:01:17.171Z")`
- Concatenate strings like `"long text" + "more text on next line"`
- Turn newline delimited JSON into a valid JSON array, for example:
    ```
    { "id": 1, "name": "John" }
    { "id": 2, "name": "Sarah" }
    ```

The `jsonrepair` library has streaming support and can handle infinitely large documents.

## Install

```
$ npm install jsonrepair
```

Note that in the `lib` folder, there are builds for ESM, UMD, and CommonJs.


## Use

### ES module

Use the `jsonrepair` function using an ES modules import:

```js
import { jsonrepair } from 'jsonrepair'

try {
  // The following is invalid JSON: is consists of JSON contents copied from 
  // a JavaScript code base, where the keys are missing double quotes, 
  // and strings are using single quotes:
  const json = "{name: 'John'}"
  
  const repaired = jsonrepair(json)
  
  console.log(repaired) // '{"name": "John"}'
} catch (err) {
  console.error(err)
}
```

### Streaming API

Use the streaming API in Node.js:

```js
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream'
import { jsonrepairTransform } from 'jsonrepair/stream'

const inputStream = createReadStream('./data/broken.json')
const outputStream = createWriteStream('./data/repaired.json')

pipeline(inputStream, jsonrepairTransform(), outputStream, (err) => {
  if (err) {
    console.error(err)
  } else {
    console.log('done')
  }
})

// or using .pipe() instead of pipeline():
// inputStream
//   .pipe(jsonrepairTransform())
//   .pipe(outputStream)
//   .on('error', (err) => console.error(err))
//   .on('finish', () => console.log('done'))
```

### CommonJS

Use in CommonJS (not recommended):

```js
const { jsonrepair } = require('jsonrepair')
const json = "{name: 'John'}"
console.log(jsonrepair(json)) // '{"name": "John"}'
```

### UMD

Use with UMD in the browser (not recommended):

```html 
<script src="/node_modules/jsonrepair/lib/umd/jsonrepair.js"></script>
<script>
  const { jsonrepair } = JSONRepair
  const json = "{name: 'John'}"
  console.log(jsonrepair(json)) // '{"name": "John"}'
</script>
```

### Python

Use in Python via [`PythonMonkey`](https://github.com/Distributive-Network/PythonMonkey#pythonmonkey).

1. Install `jsonrepair` via `npm install jsonrepair`
2. Install `PythonMonkey` via `pip install pythonmonkey`
3. Use the libraries in a Python script:
    
    ```python
    import pythonmonkey

    jsonrepair = pythonmonkey.require('jsonrepair').jsonrepair
    
    json = "[1,2,3,"
    repaired = jsonrepair(json)
    print(repaired) 
    # [1,2,3]
    ```

## API

### Regular API

You can use `jsonrepair` as a function or as a streaming transform. Broken JSON is passed to the function, and the function either returns the repaired JSON, or throws an `JSONRepairError` exception when an issue is encountered which could not be solved.

```ts
// @throws JSONRepairError 
jsonrepair(json: string) : string
```

### Streaming API

The streaming API is availabe in `jsonrepair/stream` and can be used in a [Node.js stream](https://nodejs.org/api/stream.html). It consists of a transform function that can be used in a stream pipeline.

```ts
jsonrepairTransform(options?: { chunkSize?: number, bufferSize?: number }) : Transform
```

The option `chunkSize` determines the size of the chunks that the transform outputs, and is `65536` bytes by default. Changing `chunkSize` can influcence the performance. 

The option `bufferSize` determines how many bytes of the input and output stream are kept in memory and is also `65536` bytes by default. This buffer is used as a "moving window" on the input and output. This is necessary because `jsonrepair` must look ahead or look back to see what to fix, and it must sometimes walk back the generated output to insert a missing comma for example. The `bufferSize` must be larger than the length of the largest string and whitespace in the JSON data, otherwise, and error is thrown when processing the data. Making `bufferSize` very large will result in more memory usage and less performance.

## Command Line Interface (CLI)

When `jsonrepair` is installed globally using npm, it can be used on the command line. To install `jsonrepair` globally:

```bash
$ npm install -g jsonrepair
```

Usage:

```
$ jsonrepair [filename] {OPTIONS}
```

Options:

```
--version, -v       Show application version
--help,    -h       Show this message
--output,  -o       Output file
--overwrite         Overwrite the input file
--buffer            Buffer size in bytes, for example 64K (default) or 1M
```

Example usage:

```
$ jsonrepair broken.json                        # Repair a file, output to console
$ jsonrepair broken.json > repaired.json        # Repair a file, output to file
$ jsonrepair broken.json --output repaired.json # Repair a file, output to file
$ jsonrepair broken.json --overwrite            # Repair a file, replace the file itself
$ cat broken.json | jsonrepair                  # Repair data from an input stream
$ cat broken.json | jsonrepair > repaired.json  # Repair data from an input stream, output to file
```

## Alternatives:

Similar libraries:

- https://github.com/RyanMarcus/dirty-json

## Develop

When implementing a fix or a new feature, it important to know that there are currently two implementations:

- `src/regular` This is a non-streaming implementation. The code is small and works for files up to 512MB, ideal for usage in the browser.
- `src/streaming` A streaming implementation that can be used in Node.js. The code is larger and more complex, and the implementation uses a configurable `bufferSize` and `chunkSize`. When the parsed document contains a string or number that is longer than the configured `bufferSize`, the library will throw an "Index out of range" error since it cannot hold the full string in the buffer. When configured with an infinite buffer size, the streaming implementation works the same as the regular implementation. In that case this out of range error cannot occur, but it makes the performance worse and the application can run out of memory when repairing large documents.

Both implementations are tested against the same suite of unit tests in `src/index.test.ts`.

Scripts:

Script | Description
---------- | -----------
`npm install` | Install the dependencies once
`npm run build` | Build the library (ESM, CommonJs, and UMD output in the folder `lib`)
`npm test` | Run the unit tests
`npm run lint` | Run the linter (eslint)
`npm run format` | Automatically fix linter issues
`npm run build-and-test` | Run the linter, build all, and run unit tests and integration tests
`npm run release` | Release a new version. This will lint, test, build, increment the version number, push the changes to git, add a git version tag, and publish the npm package.
`npm run release-dry-run` | Run all release steps and see the change list without actually publishing:

## License

Released under the [ISC license](LICENSE.md).
