# postgres-array [![tests](https://github.com/bendrucker/postgres-array/workflows/tests/badge.svg)](https://github.com/bendrucker/postgres-array/actions?query=workflow%3Atests)

> Parse postgres array columns


## Install

```
npm install --save postgres-array
```


## Usage

```js
const { parse } = require('postgres-array')

parse('{1,2,3}', (value) => parseInt(value, 10))
//=> [1, 2, 3]
```

## API

#### `parse(input, [transform])` -> `array`

##### input

*Required*  
Type: `string`

A Postgres array string.

##### transform

Type: `function`  
Default: `identity`

A function that transforms non-null values inserted into the array.


## License

MIT © [Ben Drucker](http://bendrucker.me)
