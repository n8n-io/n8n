# yn [![Build Status](https://travis-ci.org/sindresorhus/yn.svg?branch=master)](https://travis-ci.org/sindresorhus/yn)

> Parse yes/no like values

Useful for validating answers of a CLI prompt.

---

The following case-insensitive values are recognized:

```js
'y', 'yes', 'true', true, '1', 1, 'n', 'no', 'false', false, '0', 0
```

*Enable lenient mode to gracefully handle typos.*


## Install

```
$ npm install yn
```


## Usage

```js
const yn = require('yn');

yn('y');
//=> true

yn('NO');
//=> false

yn(true);
//=> true

yn('abomasum');
//=> null

yn('abomasum', {default: false});
//=> false

yn('mo', {lenient: true});
//=> false
```

Unrecognized values return `null`.


## API

### yn(input, [options])

#### input

Type: `any`

Value that should be converted.

#### options

Type: `Object`

##### lenient

Type: `boolean`<br>
Default: `false`

Use a key distance-based score to leniently accept typos of `yes` and `no`.

##### default

Type: `boolean`<br>
Default: `null`

Default value if no match was found.


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
