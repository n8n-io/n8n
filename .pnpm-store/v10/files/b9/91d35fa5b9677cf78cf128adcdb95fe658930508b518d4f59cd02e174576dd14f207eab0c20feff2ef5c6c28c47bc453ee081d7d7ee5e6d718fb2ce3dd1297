# fast-unique-numbers

**A module to create a set of unique numbers as fast as possible.**

[![version](https://img.shields.io/npm/v/fast-unique-numbers.svg?style=flat-square)](https://www.npmjs.com/package/fast-unique-numbers)

This module is meant to create unique numbers within a given [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set). To achieve that as fast as possible the resulting set of numbers will only contain integers. Additionally only small integers will be used for as long as possible. Small integers can be stored more efficiently by JavaScript engines like [SpiderMonkey](https://spidermonkey.dev/) or [V8](https://v8.dev).

To verify the expected perfomance benefit an expectation test is used to make sure small integers do actually perform better in Chromium based browsers, Firefox and when using Node.js.

## Usage

This module is available on [npm](https://www.npmjs.com/package/fast-unique-numbers) and can be
installed by running the following command:

```shell
npm install fast-unique-numbers
```

This module exports two functions.

### addUniqueNumber()

This function takes a `Set` of numbers as argument and appends a new unique number to it. It also returns that number.

```js
import { addUniqueNumber } from 'fast-unique-numbers';

const set = new Set([1, 4, 8]);
const uniqueNumber = addUniqueNumber(set);

console.log(uniqueNumber); // 3
console.log(set); // Set(4) { 1, 4, 8, 3 }
```

### generateUniqueNumber()

This function can be used to generate a unique number which is not yet present in the given `Set` or is no key in the given `Map`. The resulting number gets not appended. It only gets returned.

```js
import { generateUniqueNumber } from 'fast-unique-numbers';

const map = new Map([
    [1, 'something'],
    [4, 'something else']
]);

const uniqueNumber = generateUniqueNumber(map);

console.log(uniqueNumber); // 2
```
