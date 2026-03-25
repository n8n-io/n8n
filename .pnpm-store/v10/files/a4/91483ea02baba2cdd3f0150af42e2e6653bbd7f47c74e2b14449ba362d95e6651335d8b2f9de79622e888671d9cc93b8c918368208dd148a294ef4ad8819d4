# jest-diff

Display differences clearly so people can review changes confidently.

The `diff` named export serializes JavaScript **values**, compares them line-by-line, and returns a string which includes comparison lines.

Two named exports compare **strings** character-by-character:

- `diffStringsUnified` returns a string.
- `diffStringsRaw` returns an array of `Diff` objects.

Three named exports compare **arrays of strings** line-by-line:

- `diffLinesUnified` and `diffLinesUnified2` return a string.
- `diffLinesRaw` returns an array of `Diff` objects.

## Installation

To add this package as a dependency of a project, run either of the following commands:

- `npm install jest-diff`
- `yarn add jest-diff`

## Usage of `diff()`

Given JavaScript **values**, `diff(a, b, options?)` does the following:

1. **serialize** the values as strings using the `pretty-format` package
2. **compare** the strings line-by-line using the `diff-sequences` package
3. **format** the changed or common lines using the `chalk` package

To use this function, write either of the following:

- `const {diff} = require('jest-diff');` in CommonJS modules
- `import {diff} from 'jest-diff';` in ECMAScript modules

### Example of `diff()`

```js
const a = ['delete', 'common', 'changed from'];
const b = ['common', 'changed to', 'insert'];

const difference = diff(a, b);
```

The returned **string** consists of:

- annotation lines: describe the two change indicators with labels, and a blank line
- comparison lines: similar to “unified” view on GitHub, but `Expected` lines are green, `Received` lines are red, and common lines are dim (by default, see Options)

```diff
- Expected
+ Received

  Array [
-   "delete",
    "common",
-   "changed from",
+   "changed to",
+   "insert",
  ]
```

### Edge cases of `diff()`

Here are edge cases for the return value:

- `' Comparing two different types of values. …'` if the arguments have **different types** according to the `jest-get-type` package (instances of different classes have the same `'object'` type)
- `'Compared values have no visual difference.'` if the arguments have either **referential identity** according to `Object.is` method or **same serialization** according to the `pretty-format` package
- `null` if either argument is a so-called **asymmetric matcher** in Jasmine or Jest

## Usage of diffStringsUnified

Given **strings**, `diffStringsUnified(a, b, options?)` does the following:

1. **compare** the strings character-by-character using the `diff-sequences` package
2. **clean up** small (often coincidental) common substrings, also known as chaff
3. **format** the changed or common lines using the `chalk` package

Although the function is mainly for **multiline** strings, it compares any strings.

Write either of the following:

- `const {diffStringsUnified} = require('jest-diff');` in CommonJS modules
- `import {diffStringsUnified} from 'jest-diff';` in ECMAScript modules

### Example of diffStringsUnified

```js
const a = 'common\nchanged from';
const b = 'common\nchanged to';

const difference = diffStringsUnified(a, b);
```

The returned **string** consists of:

- annotation lines: describe the two change indicators with labels, and a blank line
- comparison lines: similar to “unified” view on GitHub, and **changed substrings** have **inverse** foreground and background colors (that is, `from` has white-on-green and `to` has white-on-red, which the following example does not show)

```diff
- Expected
+ Received

  common
- changed from
+ changed to
```

### Performance of diffStringsUnified

To get the benefit of **changed substrings** within the comparison lines, a character-by-character comparison has a higher computational cost (in time and space) than a line-by-line comparison.

If the input strings can have **arbitrary length**, we recommend that the calling code set a limit, beyond which splits the strings, and then calls `diffLinesUnified` instead. For example, Jest falls back to line-by-line comparison if either string has length greater than 20K characters.

## Usage of diffLinesUnified

Given **arrays of strings**, `diffLinesUnified(aLines, bLines, options?)` does the following:

1. **compare** the arrays line-by-line using the `diff-sequences` package
2. **format** the changed or common lines using the `chalk` package

You might call this function when strings have been split into lines and you do not need to see changed substrings within lines.

### Example of diffLinesUnified

```js
const aLines = ['delete', 'common', 'changed from'];
const bLines = ['common', 'changed to', 'insert'];

const difference = diffLinesUnified(aLines, bLines);
```

```diff
- Expected
+ Received

- delete
  common
- changed from
+ changed to
+ insert
```

### Edge cases of diffLinesUnified or diffStringsUnified

Here are edge cases for arguments and return values:

- both `a` and `b` are empty strings: no comparison lines
- only `a` is empty string: all comparison lines have `bColor` and `bIndicator` (see Options)
- only `b` is empty string: all comparison lines have `aColor` and `aIndicator` (see Options)
- `a` and `b` are equal non-empty strings: all comparison lines have `commonColor` and `commonIndicator` (see Options)

## Usage of diffLinesUnified2

Given two **pairs** of arrays of strings, `diffLinesUnified2(aLinesDisplay, bLinesDisplay, aLinesCompare, bLinesCompare, options?)` does the following:

1. **compare** the pair of `Compare` arrays line-by-line using the `diff-sequences` package
2. **format** the corresponding lines in the pair of `Display` arrays using the `chalk` package

Jest calls this function to consider lines as common instead of changed if the only difference is indentation.

You might call this function for case insensitive or Unicode equivalence comparison of lines.

### Example of diffLinesUnified2

```js
import {format} from 'pretty-format';

const a = {
  text: 'Ignore indentation in serialized object',
  time: '2019-09-19T12:34:56.000Z',
  type: 'CREATE_ITEM',
};
const b = {
  payload: {
    text: 'Ignore indentation in serialized object',
    time: '2019-09-19T12:34:56.000Z',
  },
  type: 'CREATE_ITEM',
};

const difference = diffLinesUnified2(
  // serialize with indentation to display lines
  format(a).split('\n'),
  format(b).split('\n'),
  // serialize without indentation to compare lines
  format(a, {indent: 0}).split('\n'),
  format(b, {indent: 0}).split('\n'),
);
```

The `text` and `time` properties are common, because their only difference is indentation:

```diff
- Expected
+ Received

  Object {
+   payload: Object {
      text: 'Ignore indentation in serialized object',
      time: '2019-09-19T12:34:56.000Z',
+   },
    type: 'CREATE_ITEM',
  }
```

The preceding example illustrates why (at least for indentation) it seems more intuitive that the function returns the common line from the `bLinesDisplay` array instead of from the `aLinesDisplay` array.

## Usage of diffStringsRaw

Given **strings** and a boolean option, `diffStringsRaw(a, b, cleanup)` does the following:

1. **compare** the strings character-by-character using the `diff-sequences` package
2. optionally **clean up** small (often coincidental) common substrings, also known as chaff

Because `diffStringsRaw` returns the difference as **data** instead of a string, you can format it as your application requires (for example, enclosed in HTML markup for browser instead of escape sequences for console).

The returned **array** describes substrings as instances of the `Diff` class, which calling code can access like array tuples:

The value at index `0` is one of the following:

| value | named export  | description           |
| ----: | :------------ | :-------------------- |
|   `0` | `DIFF_EQUAL`  | in `a` and in `b`     |
|  `-1` | `DIFF_DELETE` | in `a` but not in `b` |
|   `1` | `DIFF_INSERT` | in `b` but not in `a` |

The value at index `1` is a substring of `a` or `b` or both.

### Example of diffStringsRaw with cleanup

```js
const diffs = diffStringsRaw('changed from', 'changed to', true);
```

| `i` | `diffs[i][0]` | `diffs[i][1]` |
| --: | ------------: | :------------ |
| `0` |           `0` | `'changed '`  |
| `1` |          `-1` | `'from'`      |
| `2` |           `1` | `'to'`        |

### Example of diffStringsRaw without cleanup

```js
const diffs = diffStringsRaw('changed from', 'changed to', false);
```

| `i` | `diffs[i][0]` | `diffs[i][1]` |
| --: | ------------: | :------------ |
| `0` |           `0` | `'changed '`  |
| `1` |          `-1` | `'fr'`        |
| `2` |           `1` | `'t'`         |
| `3` |           `0` | `'o'`         |
| `4` |          `-1` | `'m'`         |

### Advanced import for diffStringsRaw

Here are all the named imports that you might need for the `diffStringsRaw` function:

- `const {DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT, Diff, diffStringsRaw} = require('jest-diff');` in CommonJS modules
- `import {DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT, Diff, diffStringsRaw} from 'jest-diff';` in ECMAScript modules

To write a **formatting** function, you might need the named constants (and `Diff` in TypeScript annotations).

If you write an application-specific **cleanup** algorithm, then you might need to call the `Diff` constructor:

```js
const diffCommon = new Diff(DIFF_EQUAL, 'changed ');
const diffDelete = new Diff(DIFF_DELETE, 'from');
const diffInsert = new Diff(DIFF_INSERT, 'to');
```

## Usage of diffLinesRaw

Given **arrays of strings**, `diffLinesRaw(aLines, bLines)` does the following:

- **compare** the arrays line-by-line using the `diff-sequences` package

Because `diffLinesRaw` returns the difference as **data** instead of a string, you can format it as your application requires.

### Example of diffLinesRaw

```js
const aLines = ['delete', 'common', 'changed from'];
const bLines = ['common', 'changed to', 'insert'];

const diffs = diffLinesRaw(aLines, bLines);
```

| `i` | `diffs[i][0]` | `diffs[i][1]`    |
| --: | ------------: | :--------------- |
| `0` |          `-1` | `'delete'`       |
| `1` |           `0` | `'common'`       |
| `2` |          `-1` | `'changed from'` |
| `3` |           `1` | `'changed to'`   |
| `4` |           `1` | `'insert'`       |

### Edge case of diffLinesRaw

If you call `string.split('\n')` for an empty string:

- the result is `['']` an array which contains an empty string
- instead of `[]` an empty array

Depending of your application, you might call `diffLinesRaw` with either array.

### Example of split method

```js
import {diffLinesRaw} from 'jest-diff';

const a = 'non-empty string';
const b = '';

const diffs = diffLinesRaw(a.split('\n'), b.split('\n'));
```

| `i` | `diffs[i][0]` | `diffs[i][1]`        |
| --: | ------------: | :------------------- |
| `0` |          `-1` | `'non-empty string'` |
| `1` |           `1` | `''`                 |

Which you might format as follows:

```diff
- Expected  - 1
+ Received  + 1

- non-empty string
+
```

### Example of splitLines0 function

For edge case behavior like the `diffLinesUnified` function, you might define a `splitLines0` function, which given an empty string, returns `[]` an empty array:

```js
export const splitLines0 = string =>
  string.length === 0 ? [] : string.split('\n');
```

```js
import {diffLinesRaw} from 'jest-diff';

const a = '';
const b = 'line 1\nline 2\nline 3';

const diffs = diffLinesRaw(a.split('\n'), b.split('\n'));
```

| `i` | `diffs[i][0]` | `diffs[i][1]` |
| --: | ------------: | :------------ |
| `0` |           `1` | `'line 1'`    |
| `1` |           `1` | `'line 2'`    |
| `2` |           `1` | `'line 3'`    |

Which you might format as follows:

```diff
- Expected  - 0
+ Received  + 3

+ line 1
+ line 2
+ line 3
```

In contrast to the `diffLinesRaw` function, the `diffLinesUnified` and `diffLinesUnified2` functions **automatically** convert array arguments computed by string `split` method, so callers do **not** need a `splitLine0` function.

## Options

The default options are for the report when an assertion fails from the `expect` package used by Jest.

For other applications, you can provide an options object as a third argument:

- `diff(a, b, options)`
- `diffStringsUnified(a, b, options)`
- `diffLinesUnified(aLines, bLines, options)`
- `diffLinesUnified2(aLinesDisplay, bLinesDisplay, aLinesCompare, bLinesCompare, options)`

### Properties of options object

| name                              | default            |
| :-------------------------------- | :----------------- |
| `aAnnotation`                     | `'Expected'`       |
| `aColor`                          | `chalk.green`      |
| `aIndicator`                      | `'-'`              |
| `bAnnotation`                     | `'Received'`       |
| `bColor`                          | `chalk.red`        |
| `bIndicator`                      | `'+'`              |
| `changeColor`                     | `chalk.inverse`    |
| `changeLineTrailingSpaceColor`    | `string => string` |
| `commonColor`                     | `chalk.dim`        |
| `commonIndicator`                 | `' '`              |
| `commonLineTrailingSpaceColor`    | `string => string` |
| `compareKeys`                     | `undefined`        |
| `contextLines`                    | `5`                |
| `emptyFirstOrLastLinePlaceholder` | `''`               |
| `expand`                          | `true`             |
| `includeChangeCounts`             | `false`            |
| `omitAnnotationLines`             | `false`            |
| `patchColor`                      | `chalk.yellow`     |

For more information about the options, see the following examples.

### Example of options for labels

If the application is code modification, you might replace the labels:

```js
const options = {
  aAnnotation: 'Original',
  bAnnotation: 'Modified',
};
```

```diff
- Original
+ Modified

  common
- changed from
+ changed to
```

The `jest-diff` package does not assume that the 2 labels have equal length.

### Example of options for colors of changed lines

For consistency with most diff tools, you might exchange the colors:

```ts
import chalk = require('chalk');

const options = {
  aColor: chalk.red,
  bColor: chalk.green,
};
```

### Example of option for color of changed substrings

Although the default inverse of foreground and background colors is hard to beat for changed substrings **within lines**, especially because it highlights spaces, if you want bold font weight on yellow background color:

```ts
import chalk = require('chalk');

const options = {
  changeColor: chalk.bold.bgYellowBright,
};
```

### Example of option to format trailing spaces

Because `diff()` does not display substring differences within lines, formatting can help you see when lines differ by the presence or absence of trailing spaces found by `/\s+$/` regular expression.

- If change lines have a background color, then you can see trailing spaces.
- If common lines have default dim color, then you cannot see trailing spaces. You might want yellowish background color to see them.

```js
const options = {
  aColor: chalk.rgb(128, 0, 128).bgRgb(255, 215, 255), // magenta
  bColor: chalk.rgb(0, 95, 0).bgRgb(215, 255, 215), // green
  commonLineTrailingSpaceColor: chalk.bgYellow,
};
```

The value of a Color option is a function, which given a string, returns a string.

If you want to replace trailing spaces with middle dot characters:

```js
const replaceSpacesWithMiddleDot = string => '·'.repeat(string.length);

const options = {
  changeLineTrailingSpaceColor: replaceSpacesWithMiddleDot,
  commonLineTrailingSpaceColor: replaceSpacesWithMiddleDot,
};
```

If you need the TypeScript type of a Color option:

```ts
import {DiffOptionsColor} from 'jest-diff';
```

### Example of options for no colors

To store the difference in a file without escape codes for colors, provide an identity function:

```js
const noColor = string => string;

const options = {
  aColor: noColor,
  bColor: noColor,
  changeColor: noColor,
  commonColor: noColor,
  patchColor: noColor,
};
```

### Example of options for indicators

For consistency with the `diff` command, you might replace the indicators:

```js
const options = {
  aIndicator: '<',
  bIndicator: '>',
};
```

The `jest-diff` package assumes (but does not enforce) that the 3 indicators have equal length.

### Example of options to limit common lines

By default, the output includes all common lines.

To emphasize the changes, you might limit the number of common “context” lines:

```js
const options = {
  contextLines: 1,
  expand: false,
};
```

A patch mark like `@@ -12,7 +12,9 @@` accounts for omitted common lines.

### Example of option for color of patch marks

If you want patch marks to have the same dim color as common lines:

```ts
import chalk = require('chalk');

const options = {
  expand: false,
  patchColor: chalk.dim,
};
```

### Example of option to include change counts

To display the number of changed lines at the right of annotation lines:

```js
const a = ['common', 'changed from'];
const b = ['common', 'changed to', 'insert'];

const options = {
  includeChangeCounts: true,
};

const difference = diff(a, b, options);
```

```diff
- Expected  - 1
+ Received  + 2

  Array [
    "common",
-   "changed from",
+   "changed to",
+   "insert",
  ]
```

### Example of option to omit annotation lines

To display only the comparison lines:

```js
const a = 'common\nchanged from';
const b = 'common\nchanged to';

const options = {
  omitAnnotationLines: true,
};

const difference = diffStringsUnified(a, b, options);
```

```diff
  common
- changed from
+ changed to
```

### Example of option for empty first or last lines

If the **first** or **last** comparison line is **empty**, because the content is empty and the indicator is a space, you might not notice it.

The replacement option is a string whose default value is `''` empty string.

Because Jest trims the report when a matcher fails, it deletes an empty last line.

Therefore, Jest uses as placeholder the downwards arrow with corner leftwards:

```js
const options = {
  emptyFirstOrLastLinePlaceholder: '↵', // U+21B5
};
```

If a content line is empty, then the corresponding comparison line is automatically trimmed to remove the margin space (represented as a middle dot below) for the default indicators:

|         Indicator | untrimmed | trimmed |
| ----------------: | :-------- | :------ |
|      `aIndicator` | `'-·'`    | `'-'`   |
|      `bIndicator` | `'+·'`    | `'+'`   |
| `commonIndicator` | `' ·'`    | `''`    |

### Example of option for sorting object keys

When two objects are compared their keys are printed in alphabetical order by default. If this was not the original order of the keys the diff becomes harder to read as the keys are not in their original position.

Use `compareKeys` to pass a function which will be used when sorting the object keys.

```js
const a = {c: 'c', b: 'b1', a: 'a'};
const b = {c: 'c', b: 'b2', a: 'a'};

const options = {
  // The keys will be in their original order
  compareKeys: () => 0,
};

const difference = diff(a, b, options);
```

```diff
- Expected
+ Received

  Object {
    "c": "c",
-   "b": "b1",
+   "b": "b2",
    "a": "a",
  }
```

Depending on the implementation of `compareKeys` any sort order can be used.

```js
const a = {c: 'c', b: 'b1', a: 'a'};
const b = {c: 'c', b: 'b2', a: 'a'};

const options = {
  // The keys will be in reverse order
  compareKeys: (a, b) => (a > b ? -1 : 1),
};

const difference = diff(a, b, options);
```

```diff
- Expected
+ Received

  Object {
    "a": "a",
-   "b": "b1",
+   "b": "b2",
    "c": "c",
  }
```
