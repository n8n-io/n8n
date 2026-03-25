# @internationalized/number

This package is part of [react-spectrum](https://github.com/adobe/react-spectrum). See the repo for more details.

## NumberParser

The `NumberParser` class can be used perform locale-aware parsing of numbers from Unicode strings,
as well as validation of partial user input. It automatically detects the numbering system
used in the input, and supports parsing decimals, percentages, currency values, and units
according to the locale.

### Parsing

```js
import {NumberParser} from '@internationalized/number';

let parser = new NumberParser('en-US', {style: 'percent'});
parser.parse('10%'); // -> 0.1
```

### Validation

```js
import {NumberParser} from '@internationalized/number';

let parser = new NumberParser('en-US', {style: 'unit', unit: 'inch'});
parser.isValidPartialNumber('10 '); // -> true
parser.isValidPartialNumber('10 in'); // -> true
parser.isValidPartialNumber('10 i'); // -> false
parser.isValidPartialNumber('10 x'); // -> false
```

### Detecting the numbering system

```js
import {NumberParser} from '@internationalized/number';

let parser = new NumberParser('en-US', {style: 'decimal'});
parser.getNumberingSystem('١٢') // -> 'arabic'
```

## NumberFormatter

The `NumberFormatter` class is a wrapper around [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) providing additional options, polyfills, and caching for performance. It provides the exact same interface as Intl.NumberFormat, so it is a drop-in replacement. Please see the MDN docs linked above for more details.

We currently polyfill the following features:

* The `signDisplay` option
* The `unit` style, currently only for the `degree` unit in the `narrow` style
