# triple-beam

Definitions of levels for logging purposes & shareable Symbol constants.

## Usage

``` js
const { LEVEL } = require('triple-beam');
const colors = require('colors/safe');

const info = {
  [LEVEL]: 'error',
  level: 'error',
  message: 'hey a logging message!'
};

// Colorize your log level!
info.level = colors.green(info.level);

// And still have an unmutated copy of your level!
console.log(info.level === 'error');  // false
console.log(info[LEVEL] === 'error'); // true
```

## Tests

Tests are written with `mocha`, `assume`, and `nyc`. They can be run with `npm`:

```
npm test
```

##### LICENSE: MIT
##### AUTHOR: [Charlie Robbins](https://github.com/indexzero)
