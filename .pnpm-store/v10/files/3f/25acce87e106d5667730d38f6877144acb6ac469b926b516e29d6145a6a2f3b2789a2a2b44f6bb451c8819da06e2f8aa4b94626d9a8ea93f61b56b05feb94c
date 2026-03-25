import {type ListenOptions} from 'node:net';

export type Options = {
	/**
	A preferred port or an iterable of preferred ports to use.
	*/
	readonly port?: number | Iterable<number>;

	/**
	Ports that should not be returned.

	You could, for example, pass it the return value of the `portNumbers()` function.
	*/
	readonly exclude?: Iterable<number>;

	/**
	The host on which port resolution should be performed. Can be either an IPv4 or IPv6 address.

	By default, it checks availability on all local addresses defined in [OS network interfaces](https://nodejs.org/api/os.html#os_os_networkinterfaces). If this option is set, it will only check the given host.
	*/
	readonly host?: string;
} & Omit<ListenOptions, 'port'>;

/**
Get an available TCP port number.

@returns Port number.

@example
```
import getPort from 'get-port';

console.log(await getPort());
//=> 51402

// Pass in a preferred port
console.log(await getPort({port: 3000}));
// Will use 3000 if available, otherwise fall back to a random port

// Pass in an array of preferred ports
console.log(await getPort({port: [3000, 3001, 3002]}));
// Will use any element in the preferred ports array if available, otherwise fall back to a random port
```
*/
export default function getPort(options?: Options): Promise<number>;

/**
Generate port numbers in the given range `from`...`to`.

@param from - The first port of the range. Must be in the range `1024`...`65535`.
@param to - The last port of the range. Must be in the range `1024`...`65535` and must be greater than `from`.
@returns The port numbers in the range.

@example
```
import getPort, {portNumbers} from 'get-port';

console.log(await getPort({port: portNumbers(3000, 3100)}));
// Will use any port from 3000 to 3100, otherwise fall back to a random port
```
*/
export function portNumbers(from: number, to: number): Iterable<number>;

/**
Clear the internal cache of locked ports.

This can be useful when you want the results to be unaffected by previous calls.

Please note that clearing the cache could cause [race conditions](https://github.com/sindresorhus/get-port#beware).

@example
```
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
*/
export function clearLockedPorts(): void;
