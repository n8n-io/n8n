# component-type

> Type assertions aka less-broken `typeof`

## Install

```sh
npm install component-type
```

## Usage

```js
import type from 'component-type';

const date = new Date();

console.log(type(date));
//=> 'date'
```

## API

```js
type(new Date) === 'date'
type({}) === 'object'
type(null) === 'null'
type(undefined) === 'undefined'
type('hey') === 'string'
type(true) === 'boolean'
type(false) === 'boolean'
type(12) === 'number'
type(type) === 'function'
type(/asdf/) === 'regexp'
type((function(){ return arguments })()) === 'arguments'
type([]) === 'array'
type(document.createElement('div')) === 'element'
type(NaN) === 'nan'
type(new Error('Oh noes')) === 'error'
type(new Buffer) === 'buffer'
```

It makes no guarantees about the correctness when fed untrusted user-input.
