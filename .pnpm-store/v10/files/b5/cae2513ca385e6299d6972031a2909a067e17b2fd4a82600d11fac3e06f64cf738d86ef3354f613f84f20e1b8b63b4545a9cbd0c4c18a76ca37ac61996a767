cli-table3 
===============================================================================

[![npm version](https://img.shields.io/npm/v/cli-table3.svg)](https://www.npmjs.com/package/cli-table3)
[![Build Status](https://github.com/cli-table/cli-table3/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/cli-table/cli-table3/actions/workflows/test.yml)

This utility allows you to render unicode-aided tables on the command line from
your node.js scripts.

`cli-table3` is based on (and api compatible with) the original [cli-table](https://github.com/Automattic/cli-table),
and [cli-table2](https://github.com/jamestalmage/cli-table2), which are both
unmaintained. `cli-table3` includes all the additional features from
`cli-table2`.

![Screenshot](https://i.imgur.com/sYq4T.png)

## Features not in the original cli-table

- Ability to make cells span columns and/or rows.
- Ability to set custom styles per cell (border characters/colors, padding, etc).
- Vertical alignment (top, bottom, center).
- [Word wrapping options](./basic-usage.md#set-wordwrap-to-true-to-wrap-text-on-word-boundaries).
- More robust truncation of cell text that contains ansi color characters.
- Better handling of text color that spans multiple lines.
- API compatible with the original cli-table.
- Exhaustive test suite including the entire original cli-table test suite.
- Lots of examples auto-generated from the tests ([basic](https://github.com/cli-table/cli-table3/blob/master/basic-usage.md), [advanced](https://github.com/cli-table/cli-table3/blob/master/advanced-usage.md)).

## Features

- Customizable characters that constitute the table.
- Color/background styling in the header through
  [<s>colors.js</s>](https://github.com/marak/colors.js)
  [@colors/colors](https://github.com/DABH/colors.js)
- Column width customization
- Text truncation based on predefined widths
- Text alignment (left, right, center)
- Padding (left, right)
- Easy-to-use API

## Installation

```bash
npm install cli-table3
```

## How to use

A portion of the unit test suite is used to generate examples:
- [basic-usage](https://github.com/cli-table/cli-table3/blob/master/basic-usage.md) - covers basic uses.
- [advanced](https://github.com/cli-table/cli-table3/blob/master/advanced-usage.md) - covers using the new column and row span features.

This package is api compatible with the original [cli-table](https://github.com/Automattic/cli-table).
So all the original documentation still applies (copied below).

### Horizontal Tables
```javascript
var Table = require('cli-table3');

// instantiate
var table = new Table({
    head: ['TH 1 label', 'TH 2 label']
  , colWidths: [100, 200]
});

// table is an Array, so you can `push`, `unshift`, `splice` and friends
table.push(
    ['First value', 'Second value']
  , ['First value', 'Second value']
);

console.log(table.toString());
```

### Vertical Tables
```javascript
var Table = require('cli-table3');
var table = new Table();

table.push(
    { 'Some key': 'Some value' }
  , { 'Another key': 'Another value' }
);

console.log(table.toString());
```
### Cross Tables
Cross tables are very similar to vertical tables, with two key differences:

1. They require a `head` setting when instantiated that has an empty string as the first header
2. The individual rows take the general form of { "Header": ["Row", "Values"] }

```javascript
var Table = require('cli-table3');
var table = new Table({ head: ["", "Top Header 1", "Top Header 2"] });

table.push(
    { 'Left Header 1': ['Value Row 1 Col 1', 'Value Row 1 Col 2'] }
  , { 'Left Header 2': ['Value Row 2 Col 1', 'Value Row 2 Col 2'] }
);

console.log(table.toString());
```

### Custom styles
The ```chars``` property controls how the table is drawn:
```javascript
var table = new Table({
  chars: { 'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗'
         , 'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝'
         , 'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼'
         , 'right': '║' , 'right-mid': '╢' , 'middle': '│' }
});

table.push(
    ['foo', 'bar', 'baz']
  , ['frob', 'bar', 'quuz']
);

console.log(table.toString());
// Outputs:
//
//╔══════╤═════╤══════╗
//║ foo  │ bar │ baz  ║
//╟──────┼─────┼──────╢
//║ frob │ bar │ quuz ║
//╚══════╧═════╧══════╝
```

Empty decoration lines will be skipped, to avoid vertical separator rows just
set the 'mid', 'left-mid', 'mid-mid', 'right-mid' to the empty string:
```javascript
var table = new Table({ chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''} });
table.push(
    ['foo', 'bar', 'baz']
  , ['frobnicate', 'bar', 'quuz']
);

console.log(table.toString());
// Outputs: (note the lack of the horizontal line between rows)
//┌────────────┬─────┬──────┐
//│ foo        │ bar │ baz  │
//│ frobnicate │ bar │ quuz │
//└────────────┴─────┴──────┘
```

By setting all chars to empty with the exception of 'middle' being set to a
single space and by setting padding to zero, it's possible to get the most
compact layout with no decorations:
```javascript
var table = new Table({
  chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
         , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
         , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
         , 'right': '' , 'right-mid': '' , 'middle': ' ' },
  style: { 'padding-left': 0, 'padding-right': 0 }
});

table.push(
    ['foo', 'bar', 'baz']
  , ['frobnicate', 'bar', 'quuz']
);

console.log(table.toString());
// Outputs:
//foo        bar baz
//frobnicate bar quuz
```

## Debugging

Later versions of cli-table3 supporting debugging your table data.

Enable and use debugging:

```
var table = new Table({ debug: 1 });
table.push([{}, {},}); // etc.

console.log(table.toString());
table.messages.forEach((message) => console.log(message));
```

If you are rendering multiple tables with debugging on run `Table.reset()` after
rendering each table.

## Build Targets

Clone the repository and run `yarn install` to install all its submodules, then run one of the following commands:

###### Run the tests with coverage reports.
```bash
$ yarn test:coverage
```

###### Run the tests every time a file changes.
```bash
$ yarn test:watch
```

###### Update the documentation.
```bash
$ yarn docs
```

## Credits

- James Talmage - author &lt;james.talmage@jrtechnical.com&gt; ([jamestalmage](https://github.com/jamestalmage))
- Guillermo Rauch - author of the original cli-table &lt;guillermo@learnboost.com&gt; ([Rauchg](https://github.com/rauchg))

## License

(The MIT License)

Copyright (c) 2014 James Talmage &lt;james.talmage@jrtechnical.com&gt;

Original cli-table code/documentation: Copyright (c) 2010 LearnBoost &lt;dev@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
