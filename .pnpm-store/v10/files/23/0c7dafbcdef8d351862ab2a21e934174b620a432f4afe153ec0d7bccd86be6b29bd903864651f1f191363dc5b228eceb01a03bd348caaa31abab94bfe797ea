# clean-regexp [![Build Status](https://travis-ci.org/SamVerschueren/clean-regexp.svg?branch=master)](https://travis-ci.org/SamVerschueren/clean-regexp)

> Clean up regular expressions


## Install

```
$ npm install clean-regexp
```


## Usage

```js
const cleanRegexp = require('clean-regexp');

cleanRegexp('[0-9]');
//=> '\\d'

cleanRegexp('[^0-9]');
//=> '\\D'

cleanRegexp('[a-zA-Z0-9_]');
//=> '\\w'

cleanRegexp('[a-z0-9_]', 'i');
//=> '\\w'

cleanRegexp('[^a-zA-Z0-9_]');
//=> '\\W'

cleanRegexp('[^a-z0-9_]', 'i');
//=> '\\W'

cleanRegexp('[a-zA-Z\\d_]');
//=> '\\w'

cleanRegexp('[^a-zA-Z\\d_]');
//=> '\\W'

cleanRegexp('[0-9]+\\.[a-zA-Z0-9_]?');
//=> '\\d+\\.\\w'
```


## API

### cleanRegexp(regexp, [flags])

#### regexp

Type: `string`

Text of the regular expression.

#### flags

Type: `string`<br>
Default: `''`

Flags of the regular expression.


## License

MIT © [Sam Verschueren](https://github.com/SamVerschueren)
