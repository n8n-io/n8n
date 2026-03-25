# get-port

> Get an available [TCP port](https://en.wikipedia.org/wiki/Port_(computer_networking)).

## Install

```sh
npm install get-port
```

## Usage

```js
import getPort from 'get-port';

console.log(await getPort());
//=> 51402
```

Pass in a preferred port:

```js
import getPort from 'get-port';

console.log(await getPort({port: 3000}));
// Will use 3000 if available, otherwise fall back to a random port
```

Pass in an array of preferred ports:

```js
import getPort from 'get-port';

console.log(await getPort({port: [3000, 3001, 3002]}));
// Will use any element in the preferred ports array if available, otherwise fall back to a random port
```

Use the `portNumbers()` helper in case you need a port in a certain range:

```js
import getPort, {portNumbers} from 'get-port';

console.log(await getPort({port: portNumbers(3000, 3100)}));
// Will use any port from 3000 to 3100, otherwise fall back to a random port
```

## API

### getPort(options?)

Returns a `Promise` for a port number.

#### options

Type: `object`

##### port

Type: `number | Iterable<number>`

A preferred port or an iterable of preferred ports to use.

##### exclude

Type: `Iterable<number>`

Ports that should not be returned.

You could, for example, pass it the return value of the `portNumbers()` function.

##### host

Type: `string`

The host on which port resolution should be performed. Can be either an IPv4 or IPv6 address.

By default, it checks availability on all local addresses defined in [OS network interfaces](https://nodejs.org/api/os.html#os_os_networkinterfaces). If this option is set, it will only check the given host.

### portNumbers(from, to)

Generate port numbers in the given range `from`...`to`.

Returns an `Iterable` for port numbers in the given range.

#### from

Type: `number`

The first port of the range. Must be in the range `1024`...`65535`.

#### to

Type: `number`

The last port of the range. Must be in the range `1024`...`65535` and must be greater than `from`.

### clearLockedPorts()

Clear the internal cache of locked ports.

This can be useful when you want the results to be unaffected by previous calls.

Please note that clearing the cache could cause [race conditions](#beware).

```js
import getPort, {clearLockedPorts} from 'get-port';

const port = [3000, 3001, 3002];

console.log(await getPort({port}));
//=> 3000

console.log(await getPort({port}));
//=> 3001

// If you want the results to be unaffected by previous calls, clear the cache.
clearLockedPorts();

console.log(await getPort({port}));
//=> 3000
```

## Beware

There is a very tiny chance of a race condition if another process starts using the same port number as you in between the time you get the port number and you actually start using it.

Race conditions in the same process are mitigated against by using a lightweight locking mechanism where a port will be held for a minimum of 15 seconds and a maximum of 30 seconds before being released again.

## Related

- [get-port-cli](https://github.com/sindresorhus/get-port-cli) - CLI for this module
