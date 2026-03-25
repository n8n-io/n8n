# postgres-array [![Build Status](https://travis-ci.org/bendrucker/postgres-array.svg?branch=master)](https://travis-ci.org/bendrucker/postgres-array)

> Parse postgres array columns


## Install

```
$ npm install --save postgres-array
```


## Usage

```js
var postgresArray = require('postgres-array')

postgresArray.parse('{1,2,3}', (value) => parseInt(value, 10))
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
