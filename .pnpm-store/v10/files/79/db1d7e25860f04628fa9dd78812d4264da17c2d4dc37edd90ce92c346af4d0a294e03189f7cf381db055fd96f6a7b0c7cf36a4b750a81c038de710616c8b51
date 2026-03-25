[![Build Status][travis-image]][travis-url]
[![Code Quality][codeclimate-image]][codeclimate-url]
[![Coverage Status][coverage-image]][coverage-url]
[![NPM version][npm-version-image]][npm-url]
[![NPM downloads][npm-dn-image]][npm-url]
[![MIT License][license-image]][license-url]

# Tmpl

The riot template engine

## Installation

### Npm

```sh
npm install @n8n-io/riot-tmpl --save
```

### Bower

From v2.4.2, bower is not supported.

## Documentation

### How it works?


Three ways:

- Expressions: `tmpl('{ value }', data)`.
  Returns the result of evaluated expression as a raw object.

- Templates: `tmpl('Hi { name } { surname }', data)`.
  Returns a string with evaluated expressions.

- Filters: `tmpl('{ show: !done, highlight: active }', data)`.
  Returns a space separated list of trueish keys (mainly used for setting html classes), e.g. "show highlight".


### Template examples

```js
tmpl('{ title || "Untitled" }', data)
tmpl('Results are { results ? "ready" : "loading" }', data)
tmpl('Today is { new Date() }', data)
tmpl('{ message.length > 140 && "Message is too long" }', data)
tmpl('This item got { Math.round(rating) } stars', data)
tmpl('<h1>{ title }</h1>{ body }', data)
```


### Falsy expressions

In templates (as opposed to single expressions) all falsy values except zero (undefined/null/false) will default to empty string:

```js
tmpl('{ undefined } - { false } - { null } - { 0 }', {})
// will return: " - - - 0"

tmpl('{}')                 // undefined
tmpl('{ false }', {})      // false
tmpl('{ null }', {})       // null
tmpl('{ 0 }', {})          // 0
```

## Changes in v2.3

* Brackets can not contain characters in the set `[\x00-\x1F<>a-zA-Z0-9'",;\\]`
* No comments in expressions, the compiler is the only that strip comments
* Attributes with expressions containing `>` must be quoted

See [API](doc/API.md) and [CHANGES](doc/CHANGES.md) for details.


[npm-version-image]: https://img.shields.io/npm/v/riot-tmpl.svg?style=flat-square
[npm-dn-image]:      https://img.shields.io/npm/dm/riot-tmpl.svg?style=flat-square
[npm-url]:           https://npmjs.org/package/riot-tmpl
[license-image]:     https://img.shields.io/badge/license-MIT-000000.svg?style=flat-square
[license-url]:       LICENSE
[travis-image]:      https://img.shields.io/travis/riot/tmpl.svg?style=flat-square
[travis-url]:        https://travis-ci.org/riot/tmpl
[coverage-image]:    https://img.shields.io/coveralls/riot/tmpl/master.svg?style=flat-square
[coverage-url]:      https://coveralls.io/r/riot/tmpl/?branch=master
[codeclimate-image]: https://img.shields.io/codeclimate/github/riot/tmpl.svg?style=flat-square
[codeclimate-url]:   https://codeclimate.com/github/riot/tmpl
