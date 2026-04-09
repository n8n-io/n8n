# lossless-json

Parse JSON without risk of losing numeric information.

```js
import { parse, stringify } from 'lossless-json'

const text = '{"decimal":2.370,"long":9123372036854000123,"big":2.3e+500}'

// JSON.parse will lose some digits and a whole number:
console.log(JSON.stringify(JSON.parse(text)))
// '{"decimal":2.37,"long":9123372036854000000,"big":null}'
// WHOOPS!!!

// LosslessJSON.parse will preserve all numbers and even the formatting:
console.log(stringify(parse(text)))
// '{"decimal":2.370,"long":9123372036854000123,"big":2.3e+500}'
```

The following in-depth article explains what happens there: [Why does JSON.parse corrupt large numbers and how to solve this?](https://jsoneditoronline.org/indepth/parse/why-does-json-parse-corrupt-large-numbers/)

**How does it work?** The library works exactly the same as the native `JSON.parse` and `JSON.stringify`. The difference is that `lossless-json` preserves information of big numbers. `lossless-json` parses numeric values not as a regular number but as a `LosslessNumber`, a lightweight class which stores the numeric value as a string. One can perform regular operations with a `LosslessNumber`, and it will throw an error when this would result in losing information.

**When to use?** If you have to deal with JSON data that contains `long` values for example, coming from an application like C++, Java, or C#. The trade-off is that `lossless-json` is slower than the native `JSON.parse` and `JSON.stringify` functions, so be careful when performance is a bottleneck for you.

Features:

- No risk of losing numeric information when working with big numbers.
- Maintain the formatting of numbers.
- Parse error on duplicate keys.
- Built-in support for `bigint`.
- Built-in support for `Date` (turned off by default).
- Customizable: parse numeric values into any data type, like `BigNumber`, `bigint`, `number`, or a mix of them.
- Compatible with the native, built-in `JSON.parse` and `JSON.stringify`.
- Helpful error messages when parsing invalid JSON.
- Works in browsers and node.js.
- Comes with TypeScript typings included.
- Modular: ES module functions, only load and bundle what you use.
- Small: the full bundle is less than `4 kB` in size when minified and gzipped.

## Install

Install via [npm](https://www.npmjs.com/package/lossless-json):

```
npm install lossless-json
```

## Use

### Parse and stringify

Parsing and stringification works as you're used to:

```js
import { parse, stringify } from 'lossless-json'

const json = parse('{"foo":"bar"}') // {foo: 'bar'}
const text = stringify(json) // '{"foo":"bar"}'
```

### LosslessNumbers

Numbers are parsed into a `LosslessNumber`, which can be used like a regular number in numeric operations. Converting to a number will throw an error when this would result in losing information due to truncation, overflow, or underflow.

```js
import { parse } from 'lossless-json'

const text = '{"normal":2.3,"long":123456789012345678901,"big":2.3e+500}'
const json = parse(text)

console.log(json.normal.isLosslessNumber) // true
console.log(json.normal.valueOf()) // number, 2.3

// LosslessNumbers can be used as regular numbers
console.log(json.normal + 2) // number, 4.3

// but the following operation will throw an error as it would result in information loss
console.log(json.long + 1)
// throws Error: Cannot safely convert LosslessNumber to number:
//   "123456789012345678901" will be parsed as 123456789012345680000 and lose information
```

### BigInt

JavaScript natively supports `bigint`: big integers that can hold a large number of digits, instead of the about 15 digits that a regular `number` can hold. It is a typical use case to want to parse integer numbers into a `bigint`, and all other values into a regular `number`. This can be achieved with a custom `numberParser`:

```js
import { parse, isInteger } from 'lossless-json'

const options = {
  // parse integer values into a bigint, and use a regular number otherwise
  numberParser: (value) => {
    return isInteger(value) ? BigInt(value) : parseFloat(value)
  }
}

const text = '[123456789123456789123456789, 2.3, 123]'
const json = parse(text, null, options)
// output:
// [
//   123456789123456789123456789n, // bigint
//   2.3, // number
//   123n // bigint
// ]
```

You can adjust the logic to your liking, using utility functions like `isInteger`, `isNumber`, `isSafeNumber`. The number parser shown above is included in the library and is named `parseNumberAndBigInt`.

### Validate safe numbers

If you want parse a json string into an object with regular numbers, but want to validate that no numeric information is lost, you write your own number parser and use `isSafeNumber` to validate the numbers:

```js
import { parse, isSafeNumber } from 'lossless-json'

const options = {
  parseNumber: (value) => {
      if (!isSafeNumber(value)) {
        throw new Error(`Cannot safely convert value '${value}' into a number`)
      }

      return parseFloat(value)
    }
}

// will parse with success if all values can be represented with a number
let json = parse('[1,2,3]', undefined, options)
console.log(json) // [1, 2, 3] (regular numbers)

// will throw an error when some of the values are too large to represent correctly as number
try {
  let json = parse('[1,2e+500,3]', undefined, options)
} catch (err) {
  console.log(err) // throws Error 'Cannot safely convert value '2e+500' into a number'
}
```

### BigNumbers

To use the library in conjunction with your favorite BigNumber library, for example [decimal.js](https://github.com/MikeMcl/decimal.js/). You have to define a custom number parser and stringifier:

```js
import { parse, stringify } from 'lossless-json'
import Decimal from 'decimal.js'

const parseDecimal = (value) => new Decimal(value)

const decimalStringifier = {
  test: (value) => Decimal.isDecimal(value),
  stringify: (value) => value.toString()
}

// parse JSON, operate on a Decimal value, then stringify again
const text = '{"value":2.3e500}'
const json = parse(text, undefined, { parseNumber: parseDecimal }) 
// {value: new Decimal('2.3e500')}

const output = {
  result: json.value.times(2)
}
// {result: new Decimal('4.6e500')}

const str = stringify(output, undefined, undefined, [decimalStringifier])
// '{"result":4.6e500}'
```

### Reviver and replacer

The library is compatible with the native `JSON.parse` and `JSON.stringify`, and also comes with the optional `reviver` and `replacer` arguments that allow you to serialize for example data classes in a custom way. Here is an example demonstrating how you can stringify a `Date` in a different way than the built-in `reviveDate` utility function.

The following example stringifies a `Date` as an object with a `$date` key instead of a string, so it is uniquely recognizable when parsing the structure:

```js
import { parse, stringify } from 'lossless-json'

// stringify a Date as a unique object with a key '$date', so it is recognizable
function customDateReplacer(key, value) {
  if (value instanceof Date) {
    return {
      $date: value.toISOString()
    }
  }

  return value
}

function isJSONDateObject(value) {
  return value && typeof value === 'object' && typeof value.$date === 'string'
}

function customDateReviver(key, value) {
  if (isJSONDateObject(value)) {
    return new Date(value.$date)
  }

  return value
}

const record = {
  message: 'Hello World',
  timestamp: new Date('2022-08-30T09:00:00Z')
}

const text = stringify(record, customDateReplacer)
console.log(text)
// output:
//   '{"message":"Hello World","timestamp":{"$date":"2022-08-30T09:00:00.000Z"}}'

const parsed = parse(text, customDateReviver)
console.log(parsed)
// output:
//   {
//     action: 'create',
//     timestamp: new Date('2022-08-30T09:00:00.000Z')
//   }
```

## API

### parse(text [, reviver [, options]])

The `LosslessJSON.parse()` function parses a string as JSON, optionally transforming the value produced by parsing.

- **@param** `{string} text`
  The string to parse as JSON. See the JSON object for a description of JSON syntax.
- **@param** `{(key: string, value: unknown) => unknown} [reviver]`
  If a function, prescribes how the value originally produced by parsing is transformed, before being returned.
- **@param** `ParseOptions | ParseNumber [options]` Pass options to customize the way numbers are parsed and duplicate keys are handled. See description below. For backward compatibility it is possible to pass a `parseNumber` function here instead of an object with property `parseNumber`. 
- **@returns** `{unknown}`
  Returns the Object corresponding to the given JSON text.
- **@throws** Throws a SyntaxError exception if the string to parse is not valid JSON.

#### options

The `options` argument in the function `parse` is either an object with properties `{ parseNumber, onDuplicateKey }`, or it is a `parseNumber` function (for backward compatibility). It has the following properties:

- **@param** `{function(value: string) : unknown} [parseNumber]`
  Pass an optional custom number parser. Input is a string, and the output can be any numeric value: `number`, `bigint`, `LosslessNumber`, or a custom `BigNumber` library. By default, all numeric values are parsed into a `LosslessNumber`.
- **@param** `{function(info: { key: string, position: number, oldValue: unknown, newValue: unknown }) : unknown | undefined} [onDuplicateKey]`
  Customize the behavior in case of duplicate keys. By default, and error is thrown in case of duplicate keys. To alter this behavior, a custom `onDuplicateKey` callback can be provided. There are a few typical cases:
  - Return the `oldValue` (first value) in order to keep that in case of duplicates.
    ```js
    onDuplicateKey: ({ oldValue }) => oldValue
    ```
  - Return the `newValue` (latest value) in order to keep that in case of duplicates:
    ```js
    onDuplicateKey: ({ newValue }) => newValue
    ```
  - Return `undefined` in order to ignore duplicate keys and keep the `oldValue` (first value):
    ```js
    onDuplicateKey: () => {}
    ```
  - Throw a custom error message. Can also be used for logging all occurrences:
    ```js
    onDuplicateKey: ({ key, position, oldValue, newValue }) => {
      console.error('Duplicate key error', { key, position, oldValue, newValue })
      throw new Error(`Duplicate key ${key} at position ${position}`)
    }
    ```

### stringify(value [, replacer [, space [, numberStringifiers]]])

The `LosslessJSON.stringify()` function converts a JavaScript value to a JSON string, optionally replacing values if a replacer function is specified, or optionally including only the specified properties if a replacer array is specified.

- **@param** `{unknown} value`
  The value to convert to a JSON string.
- **@param** `{((key: string, value: unknown) => unknown) | Array.<string | number>} [replacer]`
  A function that alters the behavior of the stringification process, or an array with strings or numbers that serve as a whitelist for selecting the properties of the value object to be included in the JSON string. If this value is `null` or not provided, all properties of the object are included in the resulting JSON string.
- **@param** `{number | string | undefined} [space]`
  A `string` or `number` that is used to insert white space into the output JSON string for readability purposes. If this is a `number`, it indicates the number of space characters to use as white space. Values less than 1 indicate that no space should be used. If this is a `string`, the `string` is used as white space. If this parameter is not provided (or is `null`), no white space is used.
- **@param** `{Array<{test: (value: unknown) => boolean, stringify: (value: unknown) => string}>} [numberStringifiers]`
  An optional list with additional number stringifiers, for example to serialize a `BigNumber`. The output of the function must be valid stringified JSON number. When `undefined` is returned, the property will be deleted from the object. The difference with using a `replacer` is that the output of a `replacer` must be JSON and will be stringified afterwards, whereas the output of the `numberStringifiers` is already stringified JSON.
- **@returns** `{string | undefined}`
  Returns the string representation of the JSON object.
- **@throws** Throws a SyntaxError when one of the `numberStringifiers` does not return valid output.

### LosslessNumber

#### Construction

```
new LosslessNumber(value: number | string) : LosslessNumber
```

#### Methods

- `.valueOf(): number | bigint`
  Convert the `LosslessNumber` into a regular `number` or `bigint`. A `number` is returned for safe numbers and decimal values that only lose some insignificant digits. A `bigint` is returned for large integer numbers. An `Error` is thrown for values that will overflow or underflow. Examples:

  ```js
  // a safe number
  console.log(new LosslessNumber('23.4').valueOf())
  // number 23.4

  // a decimal losing insignificant digits
  console.log(new LosslessNumber('0.66666666666666666666667').valueOf())
  // number 0.6666666666666666

  // a large integer
  console.log(new LosslessNumber('9123372036854000123').valueOf())
  // bigint 9123372036854000123

  // a value that will overflow
  console.log(new LosslessNumber('2.3e+500').valueOf())
  // Error: Cannot safely convert to number: the value '2.3e+500' would overflow and become Infinity

  // a value that will underflow
  console.log(new LosslessNumber('2.3e-500').valueOf())
  // Error: Cannot safely convert to number: the value '2.3e-500' would underflow and become 0
  ```

  Note that you can implement your own strategy for conversion by just getting the value as string via `.toString()`, and using util functions like `isInteger`, `isSafeNumber`, `getUnsafeNumberReason`, and `toSafeNumberOrThrow` to convert it to a numeric value.

- `.toString() : string`
  Get the string representation of the lossless number.

#### Properties

- `{boolean} .isLosslessNumber : true`
  Lossless numbers contain a property `isLosslessNumber` which can be used to
  check whether some variable contains LosslessNumber.

### Utility functions

- `isInteger(value: string) : boolean`

  Test whether a string contains an integer value, like `'2300'` or `10`.

- `isNumber(value: string) : boolean`

  Test whether a string contains a numeric value, like `'2.4'` or `'1.4e+3'`.

- `isSafeNumber(value: string, config?: { approx: boolean }): boolean`

  Test whether a string contains a numeric value which can be safely represented by a JavaScript `number` without losing any information. Returns false when digits would be truncated of an integer or decimal, or when the number would overflow or underflow. When passing `{ approx: true }` as config, the function will be less strict and allow losing insignificant digits of a decimal value. Examples:

  ```js
  isSafeNumber('1.55e3') // true
  isSafeNumber('2e500') // false
  isSafeNumber('2e-500') // false
  isSafeNumber('9123372036854000123') // false
  isSafeNumber('0.66666666666666666667') // false
  isSafeNumber('9123372036854000123', { approx: true }) // false
  isSafeNumber('0.66666666666666666667', { approx: true }) // true
  ```

- `toSafeNumberOrThrow(value: string, config?: { approx: boolean }) : number`

  Convert a string into a number when it is safe to do so, otherwise throw an informative error.

- `getUnsafeNumberReason(value): UnsafeNumberReason | undefined`

  When the provided `value` is an unsafe number, describe what the reason is: `overflow`, `underflow`, `truncate_integer`, `truncate_float`. Returns `undefined` when the value is safe.

- `isLosslessNumber(value: unknown) : boolean`

  Test whether a value is a `LosslessNumber`.

- `toLosslessNumber(value: number) : LosslessNumber`

  Convert a `number` into a `LosslessNumber`. The function will throw an exception when the `number` is exceeding the maximum safe limit of 15 digits (hence being truncated itself) or is `NaN` or `Infinity`.

- `parseLosslessNumber(value: string) : LosslessNumber`

  The default `numberParser` used by `parse`. Creates a `LosslessNumber` from a string containing a numeric value.

- `parseNumberAndBigInt(value: string) : number | bigint`

  A custom `numberParser` that can be used by `parse`. The parser will convert integer values into `bigint`, and converts al other values into a regular `number`.

- `reviveDate(key, value)`

  Revive strings containing an ISO 8601 date string into a JavaScript `Date` object. This reviver is not turned on by default because there is a small risk of parsing a text field that _accidentally_ contains a date into a `Date`. Whether `reviveDate` is safe to use depends on the use case. Usage:

  ```js
  import { parse, reviveDate } from 'lossless-json'

  const data = parse('["2022-08-25T09:39:19.288Z"]', reviveDate)
  // output:
  // [
  //   new Date('2022-08-25T09:39:19.288Z')
  // ]
  ```

  An alternative solution is to stringify a `Date` in a specific recognizable object like `{'$date':'2022-08-25T09:39:19.288Z'}`, and use a reviver and replacer to turn this object into a `Date` and vice versa.

- `splitNumber(value: string) : { sign: '-' | '', digits: string, exponent: number }`

  Split a number in its sign, digits, and exponent. For example `splitNumber("23.50")` returns `{sign: '', digits: '235', exp: 1 }`. The value can be constructed again from a split number by inserting a dot at the second character of the digits if there is more than one digit, prepending it with the sign, and appending the exponent like `e${exponent}`
- `compareNumber(a: string, b: string) : -1 | 0 | 1`

  Compare two strings containing a numeric value based on their numerical value. For example, the numeric value of `"5e3"` is larger than `"70"`, but comparing the string characters concludes otherwise. The function returns `1` when `a` is larger than `b`, `0` when they are equal,  and `-1` when `a` is smaller than `b`. This method works safely for values with a large number of digits.
- `compareLosslessNumber(a: LosslessNumber, b: LosslessNumber) : -1 | 0 | 1`

  Compare two lossless numbers numerically. The function returns `1` when `a` is larger than `b`, `0` when they are equal,  and `-1` when `a` is smaller than `b`. The compare function can be used to sort an array with `LosslessNumber` for example:

  ```js
  import { LosslessNumber, compareLosslessNumber } from 'lossless-json'
  
  const values = [
    new LosslessNumber('5e3'),
    new LosslessNumber('70'),
    new LosslessNumber('0.02e5')
  ]
  
  const sorted = values.toSorted(compareLosslessNumber)
  // sorted = [
  //  new LosslessNumber('70'),
  //  new LosslessNumber('0.02e5'),
  //  new LosslessNumber('5e3')
  //]
  ```

## Alternatives

Similar libraries:

- https://github.com/jawj/json-custom-numbers
- https://github.com/sidorares/json-bigint
- https://github.com/nicolasparada/js-json-bigint
- https://github.com/epoberezkin/json-source-map

## Test

To test the library, first install dependencies once:

```
npm install
```

To run the unit tests:

```
npm test
```

To build the library and run the unit tests and integration tests:

```
npm run build-and-test
```

## Lint

Run linting:

```
npm run lint
```

Fix linting issues automatically:

```
npm run format
```

## Benchmark

To run a benchmark to compare the performance with the native `JSON` parser:

```
npm run benchmark
```

(Spoiler: `lossless-json` is much slower than native)

## Build

To build a bundled and minified library (ES5), first install the dependencies once:

```
npm install
```

Then bundle the code:

```
npm run build
```

This will generate an ES module output and an UMD bundle in the folder `./.lib` which can be executed in browsers and node.js and used in the browser.

### Release

To release a new version:

```
$ npm run release
```

This will:

- lint
- test
- build
- increment the version number
- push the changes to git, add a git version tag
- publish the npm package

To try the build and see the change list without actually publishing:

```
$ npm run release-dry-run
```

## License

Released under the [MIT license](LICENSE.md).
