# kuler

Kuler is small and nifty node module that allows you to create terminal based
colors using hex color codes, just like you're used to doing in your CSS. We're
in a modern world now and terminals support more than 16 colors so we are stupid
to not take advantage of this.

## Installation

The package is released in the public npm registry and can be installed by
running:

```
npm install --save kuler
```

## Usage

To color a string simply pass it the string you want to have colored as first
argument and the color as hex as second argument:

```js
'use strict';

const kuler = require('kuler');
const str = kuler('foo', '#FF6600');
```

The color code sequence is automatically terminated at the end of the string so
the colors do no bleed to other pieces of text. So doing:

```js
console.log(kuler('red', '#F00'), 'normal');
```

Will work without any issues.

## License

[MIT](LICENSE)
