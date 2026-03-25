# diff-sequences

Compare items in two sequences to find a **longest common subsequence**.

The items not in common are the items to delete or insert in a **shortest edit script**.

To maximize flexibility and minimize memory, you write **callback** functions as configuration:

**Input** function `isCommon(aIndex, bIndex)` compares items at indexes in the sequences and returns a truthy/falsey value. This package might call your function more than once for some pairs of indexes.

- Because your function encapsulates **comparison**, this package can compare items according to `===` operator, `Object.is` method, or other criterion.
- Because your function encapsulates **sequences**, this package can find differences in arrays, strings, or other data.

**Output** function `foundSubsequence(nCommon, aCommon, bCommon)` receives the number of adjacent items and starting indexes of each common subsequence. If sequences do not have common items, then this package does not call your function.

If N is the sum of lengths of sequences and L is length of a longest common subsequence, then D = N – 2L is the number of **differences** in the corresponding shortest edit script.

[_An O(ND) Difference Algorithm and Its Variations_](http://xmailserver.org/diff2.pdf) by Eugene W. Myers is fast when sequences have **few** differences.

This package implements the **linear space** variation with optimizations so it is fast even when sequences have **many** differences.

## Usage

To add this package as a dependency of a project, do either of the following:

- `npm install diff-sequences`
- `yarn add diff-sequences`

To use `diff` as the name of the default export from this package, do either of the following:

- `var diff = require('diff-sequences').default; // CommonJS modules`
- `import diff from 'diff-sequences'; // ECMAScript modules`

Call `diff` with the **lengths** of sequences and your **callback** functions:

```js
const a = ['a', 'b', 'c', 'a', 'b', 'b', 'a'];
const b = ['c', 'b', 'a', 'b', 'a', 'c'];

function isCommon(aIndex, bIndex) {
  return a[aIndex] === b[bIndex];
}
function foundSubsequence(nCommon, aCommon, bCommon) {
  // see examples
}

diff(a.length, b.length, isCommon, foundSubsequence);
```

## Example of longest common subsequence

Some sequences (for example, `a` and `b` in the example of usage) have more than one longest common subsequence.

This package finds the following common items:

| comparisons of common items      | values     |            output arguments |
| :------------------------------- | :--------- | --------------------------: |
| `a[2] === b[0]`                  | `'c'`      | `foundSubsequence(1, 2, 0)` |
| `a[4] === b[1]`                  | `'b'`      | `foundSubsequence(1, 4, 1)` |
| `a[5] === b[3] && a[6] === b[4]` | `'b', 'a'` | `foundSubsequence(2, 5, 3)` |

The “edit graph” analogy in the Myers paper shows the following common items:

| comparisons of common items      | values     |
| :------------------------------- | :--------- |
| `a[2] === b[0]`                  | `'c'`      |
| `a[3] === b[2] && a[4] === b[3]` | `'a', 'b'` |
| `a[6] === b[4]`                  | `'a'`      |

Various packages which implement the Myers algorithm will **always agree** on the **length** of a longest common subsequence, but might **sometimes disagree** on which **items** are in it.

## Example of callback functions to count common items

```js
// Return length of longest common subsequence according to === operator.
function countCommonItems(a, b) {
  let n = 0;
  function isCommon(aIndex, bIndex) {
    return a[aIndex] === b[bIndex];
  }
  function foundSubsequence(nCommon) {
    n += nCommon;
  }

  diff(a.length, b.length, isCommon, foundSubsequence);

  return n;
}

const commonLength = countCommonItems(
  ['a', 'b', 'c', 'a', 'b', 'b', 'a'],
  ['c', 'b', 'a', 'b', 'a', 'c'],
);
```

| category of items  |                expression | value |
| :----------------- | ------------------------: | ----: |
| in common          |            `commonLength` |   `4` |
| to delete from `a` | `a.length - commonLength` |   `3` |
| to insert from `b` | `b.length - commonLength` |   `2` |

If the length difference `b.length - a.length` is:

- negative: its absolute value is the minimum number of items to **delete** from `a`
- positive: it is the minimum number of items to **insert** from `b`
- zero: there is an **equal** number of items to delete from `a` and insert from `b`
- non-zero: there is an equal number of **additional** items to delete from `a` and insert from `b`

In this example, `6 - 7` is:

- negative: `1` is the minimum number of items to **delete** from `a`
- non-zero: `2` is the number of **additional** items to delete from `a` and insert from `b`

## Example of callback functions to find common items

```js
// Return array of items in longest common subsequence according to Object.is method.
const findCommonItems = (a, b) => {
  const array = [];
  diff(
    a.length,
    b.length,
    (aIndex, bIndex) => Object.is(a[aIndex], b[bIndex]),
    (nCommon, aCommon) => {
      for (; nCommon !== 0; nCommon -= 1, aCommon += 1) {
        array.push(a[aCommon]);
      }
    },
  );
  return array;
};

const commonItems = findCommonItems(
  ['a', 'b', 'c', 'a', 'b', 'b', 'a'],
  ['c', 'b', 'a', 'b', 'a', 'c'],
);
```

| `i` | `commonItems[i]` | `aIndex` |
| --: | :--------------- | -------: |
| `0` | `'c'`            |      `2` |
| `1` | `'b'`            |      `4` |
| `2` | `'b'`            |      `5` |
| `3` | `'a'`            |      `6` |

## Example of callback functions to diff index intervals

Instead of slicing array-like objects, you can adjust indexes in your callback functions.

```js
// Diff index intervals that are half open [start, end) like array slice method.
const diffIndexIntervals = (a, aStart, aEnd, b, bStart, bEnd) => {
  // Validate: 0 <= aStart and aStart <= aEnd and aEnd <= a.length
  // Validate: 0 <= bStart and bStart <= bEnd and bEnd <= b.length

  diff(
    aEnd - aStart,
    bEnd - bStart,
    (aIndex, bIndex) => Object.is(a[aStart + aIndex], b[bStart + bIndex]),
    (nCommon, aCommon, bCommon) => {
      // aStart + aCommon, bStart + bCommon
    },
  );

  // After the last common subsequence, do any remaining work.
};
```

## Example of callback functions to emulate diff command

Linux or Unix has a `diff` command to compare files line by line. Its output is a **shortest edit script**:

- **c**hange adjacent lines from the first file to lines from the second file
- **d**elete lines from the first file
- **a**ppend or insert lines from the second file

```js
// Given zero-based half-open range [start, end) of array indexes,
// return one-based closed range [start + 1, end] as string.
const getRange = (start, end) =>
  start + 1 === end ? `${start + 1}` : `${start + 1},${end}`;

// Given index intervals of lines to delete or insert, or both, or neither,
// push formatted diff lines onto array.
const pushDelIns = (aLines, aIndex, aEnd, bLines, bIndex, bEnd, array) => {
  const deleteLines = aIndex !== aEnd;
  const insertLines = bIndex !== bEnd;
  const changeLines = deleteLines && insertLines;
  if (changeLines) {
    array.push(`${getRange(aIndex, aEnd)}c${getRange(bIndex, bEnd)}`);
  } else if (deleteLines) {
    array.push(`${getRange(aIndex, aEnd)}d${String(bIndex)}`);
  } else if (insertLines) {
    array.push(`${String(aIndex)}a${getRange(bIndex, bEnd)}`);
  } else {
    return;
  }

  for (; aIndex !== aEnd; aIndex += 1) {
    array.push(`< ${aLines[aIndex]}`); // delete is less than
  }

  if (changeLines) {
    array.push('---');
  }

  for (; bIndex !== bEnd; bIndex += 1) {
    array.push(`> ${bLines[bIndex]}`); // insert is greater than
  }
};

// Given content of two files, return emulated output of diff utility.
const findShortestEditScript = (a, b) => {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const aLength = aLines.length;
  const bLength = bLines.length;

  const isCommon = (aIndex, bIndex) => aLines[aIndex] === bLines[bIndex];

  let aIndex = 0;
  let bIndex = 0;
  const array = [];
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    pushDelIns(aLines, aIndex, aCommon, bLines, bIndex, bCommon, array);
    aIndex = aCommon + nCommon; // number of lines compared in a
    bIndex = bCommon + nCommon; // number of lines compared in b
  };

  diff(aLength, bLength, isCommon, foundSubsequence);

  // After the last common subsequence, push remaining change lines.
  pushDelIns(aLines, aIndex, aLength, bLines, bIndex, bLength, array);

  return array.length === 0 ? '' : `${array.join('\n')}\n`;
};
```

## Example of callback functions to format diff lines

Here is simplified code to format **changed and unchanged lines** in expected and received values after a test fails in Jest:

```js
// Format diff with minus or plus for change lines and space for common lines.
const formatDiffLines = (a, b) => {
  // Jest depends on pretty-format package to serialize objects as strings.
  // Unindented for comparison to avoid distracting differences:
  const aLinesUn = format(a, {indent: 0 /*, other options*/}).split('\n');
  const bLinesUn = format(b, {indent: 0 /*, other options*/}).split('\n');
  // Indented to display changed and unchanged lines:
  const aLinesIn = format(a, {indent: 2 /*, other options*/}).split('\n');
  const bLinesIn = format(b, {indent: 2 /*, other options*/}).split('\n');

  const aLength = aLinesIn.length; // Validate: aLinesUn.length === aLength
  const bLength = bLinesIn.length; // Validate: bLinesUn.length === bLength

  const isCommon = (aIndex, bIndex) => aLinesUn[aIndex] === bLinesUn[bIndex];

  // Only because the GitHub Flavored Markdown doc collapses adjacent spaces,
  // this example code and the following table represent spaces as middle dots.
  let aIndex = 0;
  let bIndex = 0;
  const array = [];
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    for (; aIndex !== aCommon; aIndex += 1) {
      array.push(`-·${aLinesIn[aIndex]}`); // delete is minus
    }
    for (; bIndex !== bCommon; bIndex += 1) {
      array.push(`+·${bLinesIn[bIndex]}`); // insert is plus
    }
    for (; nCommon !== 0; nCommon -= 1, aIndex += 1, bIndex += 1) {
      // For common lines, received indentation seems more intuitive.
      array.push(`··${bLinesIn[bIndex]}`); // common is space
    }
  };

  diff(aLength, bLength, isCommon, foundSubsequence);

  // After the last common subsequence, push remaining change lines.
  for (; aIndex !== aLength; aIndex += 1) {
    array.push(`-·${aLinesIn[aIndex]}`);
  }
  for (; bIndex !== bLength; bIndex += 1) {
    array.push(`+·${bLinesIn[bIndex]}`);
  }

  return array;
};

const expected = {
  searching: '',
  sorting: {
    ascending: true,
    fieldKey: 'what',
  },
};
const received = {
  searching: '',
  sorting: [
    {
      descending: false,
      fieldKey: 'what',
    },
  ],
};

const diffLines = formatDiffLines(expected, received);
```

If N is the sum of lengths of sequences and L is length of a longest common subsequence, then N – L is length of an array of diff lines. In this example, N is 7 + 9, L is 5, and N – L is 11.

|  `i` | `diffLines[i]`                     | `aIndex` | `bIndex` |
| ---: | :--------------------------------- | -------: | -------: |
|  `0` | `'··Object {'`                     |      `0` |      `0` |
|  `1` | `'····"searching": "",'`           |      `1` |      `1` |
|  `2` | `'-···"sorting": Object {'`        |      `2` |          |
|  `3` | `'-·····"ascending": true,'`       |      `3` |          |
|  `4` | `'+·····"sorting": Array ['`       |          |      `2` |
|  `5` | `'+·······Object {'`               |          |      `3` |
|  `6` | `'+·········"descending": false,'` |          |      `4` |
|  `7` | `'··········"fieldKey": "what",'`  |      `4` |      `5` |
|  `8` | `'········},'`                     |      `5` |      `6` |
|  `9` | `'+·····],'`                       |          |      `7` |
| `10` | `'··}'`                            |      `6` |      `8` |

## Example of callback functions to find diff items

Here is simplified code to find changed and unchanged substrings **within adjacent changed lines** in expected and received values after a test fails in Jest:

```js
// Return diff items for strings (compatible with diff-match-patch package).
const findDiffItems = (a, b) => {
  const isCommon = (aIndex, bIndex) => a[aIndex] === b[bIndex];

  let aIndex = 0;
  let bIndex = 0;
  const array = [];
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    if (aIndex !== aCommon) {
      array.push([-1, a.slice(aIndex, aCommon)]); // delete is -1
    }
    if (bIndex !== bCommon) {
      array.push([1, b.slice(bIndex, bCommon)]); // insert is 1
    }

    aIndex = aCommon + nCommon; // number of characters compared in a
    bIndex = bCommon + nCommon; // number of characters compared in b
    array.push([0, a.slice(aCommon, aIndex)]); // common is 0
  };

  diff(a.length, b.length, isCommon, foundSubsequence);

  // After the last common subsequence, push remaining change items.
  if (aIndex !== a.length) {
    array.push([-1, a.slice(aIndex)]);
  }
  if (bIndex !== b.length) {
    array.push([1, b.slice(bIndex)]);
  }

  return array;
};

const expectedDeleted = ['"sorting": Object {', '"ascending": true,'].join(
  '\n',
);
const receivedInserted = [
  '"sorting": Array [',
  'Object {',
  '"descending": false,',
].join('\n');

const diffItems = findDiffItems(expectedDeleted, receivedInserted);
```

| `i` | `diffItems[i][0]` | `diffItems[i][1]` |
| --: | ----------------: | :---------------- |
| `0` |               `0` | `'"sorting": '`   |
| `1` |               `1` | `'Array [\n'`     |
| `2` |               `0` | `'Object {\n"'`   |
| `3` |              `-1` | `'a'`             |
| `4` |               `1` | `'de'`            |
| `5` |               `0` | `'scending": '`   |
| `6` |              `-1` | `'tru'`           |
| `7` |               `1` | `'fals'`          |
| `8` |               `0` | `'e,'`            |

The length difference `b.length - a.length` is equal to the sum of `diffItems[i][0]` values times `diffItems[i][1]` lengths. In this example, the difference `48 - 38` is equal to the sum `10`.

| category of diff item | `[0]` |      `[1]` lengths | subtotal |
| :-------------------- | ----: | -----------------: | -------: |
| in common             |   `0` | `11 + 10 + 11 + 2` |      `0` |
| to delete from `a`    |  `–1` |            `1 + 3` |     `-4` |
| to insert from `b`    |   `1` |        `8 + 2 + 4` |     `14` |

Instead of formatting the changed substrings with escape codes for colors in the `foundSubsequence` function to save memory, this example spends memory to **gain flexibility** before formatting, so a separate heuristic algorithm might modify the generic array of diff items to show changes more clearly:

| `i` | `diffItems[i][0]` | `diffItems[i][1]` |
| --: | ----------------: | :---------------- |
| `6` |              `-1` | `'true'`          |
| `7` |               `1` | `'false'`         |
| `8` |               `0` | `','`             |

For expected and received strings of serialized data, the result of finding changed **lines**, and then finding changed **substrings** within adjacent changed lines (as in the preceding two examples) sometimes displays the changes in a more intuitive way than the result of finding changed substrings, and then splitting them into changed and unchanged lines.
