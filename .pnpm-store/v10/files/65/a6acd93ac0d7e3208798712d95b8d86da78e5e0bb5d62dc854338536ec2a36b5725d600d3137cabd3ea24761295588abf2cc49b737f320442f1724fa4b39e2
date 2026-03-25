# STYLIS

[![stylis](https://stylis.js.org/assets/logo.svg)](https://github.com/thysultan/stylis.js)

A Light–weight CSS Preprocessor.

[![Coverage](https://coveralls.io/repos/github/thysultan/stylis.js/badge.svg?branch=master)](https://coveralls.io/github/thysultan/stylis.js)
[![Size](https://badgen.net/bundlephobia/minzip/stylis)](https://bundlephobia.com/result?p=stylis)
[![Licence](https://badgen.net/badge/license/MIT/blue)](https://github.com/thysultan/stylis.js/blob/master/LICENSE)
[![NPM](https://badgen.net/npm/v/stylis)](https://www.npmjs.com/package/stylis)

## Installation

* Use a Direct Download: `<script src=stylis.js></script>`
* Use a CDN: `<script src=unpkg.com/stylis></script>`
* Use NPM: `npm install stylis --save`

## Features

- nesting `a { &:hover {} }`
- selector namespacing
- vendor prefixing (flex-box, etc...)
- minification
- esm module compatible
- tree-shaking-able

## Abstract Syntax Structure

```js
const declaration = {
	value: 'color:red;',
	type: 'decl',
	props: 'color',
	children: 'red',
	line: 1, column: 1
}

const comment = {
	value: '/*@noflip*/',
	type: 'comm',
	props: '/',
	children: '@noflip',
	line: 1, column: 1
}

const ruleset = {
	value: 'h1,h2',
	type: 'rule',
	props: ['h1', 'h2'],
	children: [/* ... */],
	line: 1, column: 1
}

const atruleset = {
	value: '@media (max-width:100), (min-width:100)',
	type: '@media',
	props: ['(max-width:100)', '(min-width:100)'],
	children: [/* ... */],
	line: 1, column: 1
}
```

## Example:

```js
import {compile, serialize, stringify} from 'stylis'

serialize(compile(`h1{all:unset}`), stringify)
```

### Compile

```js
compile('h1{all:unset}') === [{value: 'h1', type: 'rule', props: ['h1'], children: [/* ... */]}]
compile('--foo:unset;') === [{value: '--foo:unset;', type: 'decl', props: '--foo', children: 'unset'}]
```

### Tokenize

```js
tokenize('h1 h2 h3 [h4 h5] fn(args) "a b c"') === ['h1', 'h2', 'h3', '[h4 h5]', 'fn', '(args)', '"a b c"']
```

### Serialize

```js
serialize(compile('h1{all:unset}'), stringify)
```

### Vendor Prefixing

```js
import {compile, serialize, stringify, middleware, prefixer } from 'stylis';

serialize(compile('div{display:flex;}'), middleware([prefixer, stringify]))
```


## Middleware

The middleware helper is a convenient helper utility, that for all intents and purposes you can do without if you intend to implement your own traversal logic. The `stringify` middleware is one such middleware that can be used in conjunction with it.

Elements passed to middlewares have a `root` property that is the immediate root/parent of the current element **in the compiled output**, so it references the parent in the already expanded CSS-like structure. Elements have also `parent` property that is the immediate parent of the current element **from the input structure** (structure representing the input string).

### Traversal

```js
serialize(compile('h1{all:unset}'), middleware([(element, index, children) => {
	assert(children === element.root.children && children[index] === element.children)
}, stringify])) === 'h1{all:unset;}'
```

The abstract syntax tree also includes an additional `return` property for more niche uses.

### Prefixing

```js
serialize(compile('h1{all:unset}'), middleware([(element, index, children, callback) => {
	if (element.type === 'decl' && element.props === 'all' && element.children === 'unset')
		element.return = 'color:red;' + element.value
}, stringify])) === 'h1{color:red;all:unset;}'
```

```js
serialize(compile('h1{all:unset}'), middleware([(element, index, children, callback) => {
	if (element.type === 'rule' && element.props.indexOf('h1') > -1)
		return serialize([{...element, props: ['h2', 'h3']}], callback)
}, stringify])) === 'h2,h3{all:unset;}h1{all:unset;}'
```

### Reading

```js
serialize(compile('h1{all:unset}'), middleware([stringify, (element, index, children) => {
	assert(element.return === 'h1{all:unset;}')
}])) === 'h1{all:unset;color:red;}'
```

The middlewares in [src/Middleware.js](src/Middleware.js) dive into tangible examples of how you might implement a middleware, alternatively you could also create your own middleware system as `compile` returns all the nessessary structure to fork from.

## Variables

CSS variables are supported but a note should be made about the exotic use of css variables. The css spec mentions the following

>The allowed syntax for custom properties is extremely permissive. The <declaration-value> production matches any sequence of one or more tokens, so long as the sequence does not contain <bad-string-token>, <bad-url-token>, unmatched <)-token>, <]-token>, or <}-token>, or top-level <semicolon-token> tokens or <delim-token> tokens with a value of "!".

That is to say css variables according to the spec allows: `--foo: if(x > 5) this.width = 10;` and while this value is obviously useless as a variable, and would be invalid in any normal property, it still might be read and acted on by JavaScript and this is supported by Stylis, however things become slightly undefined when we start to include the `{` and `}` productions in our use of exotic css variables. 

For example consider the following: `--foo: {};`

While this is valid CSS and supported. It is unclear what should happen when the rule collides with the implicit block termination rule that allows i.e `h1{color:red}`(notice the omitted semicolon) to also be a valid CSS production. This results in the following contradiction in: `h1{--example: {}` is it to be treated as `h1{--foo:{;}` or `h1{--foo:{}` the later of which is an unterminated block or in the following: `h1{--foo:{} h1{color:red;}` should it be `h1 {--foo:{}h1{color:red;};` where `{}h1{color:red;` is part of the css variable `--foo` and not a new rule or should it be something else? 

Nevertheless Stylis still supports the exotic forms highlighted in the spec, however you should consider it as a general rule to delimit such exotic uses of variables in strings or parentheses i.e: `h1{--foo:'{'}` or `h1{--foo:({)}`. 

## Benchmark

Stylis is at-least 2X faster than its predecesor.

### License

Stylis is [MIT licensed](./LICENSE).
