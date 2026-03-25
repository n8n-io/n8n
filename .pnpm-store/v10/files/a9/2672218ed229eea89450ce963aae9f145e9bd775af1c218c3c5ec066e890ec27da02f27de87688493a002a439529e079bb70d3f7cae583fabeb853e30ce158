# get-port [![Build Status](https://travis-ci.org/sindresorhus/get-port.svg?branch=master)](https://travis-ci.org/sindresorhus/get-port)

> Get an available [TCP port](https://en.wikipedia.org/wiki/Port_(computer_networking))

## Install

```
$ npm install get-port
```

## Usage

```js
const getPort = require('get-port');

(async () => {
	console.log(await getPort());
	//=> 51402
})();
```

Pass in a preferred port:

```js
(async () => {
	console.log(await getPort({port: 3000}));
	// Will use 3000 if available, otherwise fall back to a random port
})();
```

Pass in an array of preferred ports:

```js
(async () => {
	console.log(await getPort({port: [3000, 3001, 3002]}));
	// Will use any element in the preferred ports array if available, otherwise fall back to a random port
})();
```

Use the `makeRange()` helper in case you need a port in a certain range:

```js
(async () => {
	console.log(await getPort({port: getPort.makeRange(3000, 3100)}));
	// Will use any port from 3000 to 3100, otherwise fall back to a random port
})();
```

## API

### getPort(options?)

Returns a `Promise` for a port number.

#### options

Type: `object`

##### port

Type: `number | Iterable<number>`

A preferred port or an iterable of preferred ports to use.

##### host

Type: `string`

The host on which port resolution should be performed. Can be either an IPv4 or IPv6 address.

### getPort.makeRange(from, to)

Make a range of ports `from`...`to`.

Returns an `Iterable` for ports in the given range.

#### from

Type: `number`

First port of the range. Must be in the range `1024`...`65535`.

#### to

Type: `number`

Last port of the range. Must be in the range `1024`...`65535` and must be greater than `from`.

## Beware

There is a very tiny chance of a race condition if another process starts using the same port number as you in between the time you get the port number and you actually start using it.

Race conditions in the same process are mitigated against by using a lightweight locking mechanism where a port will be held for a minimum of 15 seconds and a maximum of 30 seconds before being released again.

## Related

- [get-port-cli](https://github.com/sindresorhus/get-port-cli) - CLI for this module

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-get-port?utm_source=npm-get-port&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
