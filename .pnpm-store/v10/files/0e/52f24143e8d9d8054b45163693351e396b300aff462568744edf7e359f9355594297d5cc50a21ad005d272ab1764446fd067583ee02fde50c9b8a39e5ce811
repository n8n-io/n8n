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

##### reserve

Type: `boolean`\
Default: `false`

Reserve the port so that it's locked for the lifetime of the process instead of the default 15-30 seconds.

This is useful when there is a long delay between getting the port and actually binding to it, such as in long-running test suites.

Reserved ports are locked globally by port number for the current process, even if you looked them up with a specific `host` or `ipv6Only` option.

Use [`clearLockedPorts()`](#clearlockedports) to release reserved ports.

##### host

Type: `string`

The host on which port resolution should be performed. Can be either an IPv4 or IPv6 address.

By default, it checks availability on all local addresses defined in [OS network interfaces](https://nodejs.org/api/os.html#os_os_networkinterfaces). If this option is set, it will only check the given host.

### portNumbers(from, to)

Generate port numbers in the given range `from`...`to`.

Returns an `Iterable` for port numbers in the given range.

```js
import getPort, {portNumbers} from 'get-port';

console.log(await getPort({port: portNumbers(3000, 3100)}));
// Will use any port from 3000 to 3100, otherwise fall back to a random port
```

#### from

Type: `number`

The first port of the range. Must be in the range `1024`...`65535`.

#### to

Type: `number`

The last port of the range. Must be in the range `1024`...`65535` and must be greater than `from`.

### clearLockedPorts()

Clear the internal cache of locked ports, including any ports locked with the [`reserve`](#reserve) option.

This can be useful when you want the results to be unaffected by previous calls.

Please note that clearing the cache removes protection against [in-process race conditions](#beware).

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

**In-process race conditions** (such as when running parallel Jest tests) are completely eliminated by a lightweight locking mechanism where returned ports are held for 15-30 seconds before being eligible for reuse. If the delay between getting a port and binding to it may exceed this window (for example, in long-running test suites), use the [`reserve`](#reserve) option to lock the port for the lifetime of the process.

**Multi-process race conditions** are extremely rare and will result in an immediate `EADDRINUSE` error when attempting to bind to the port, allowing your application to retry.

## Related

- [get-port-cli](https://github.com/sindresorhus/get-port-cli) - CLI for this module
