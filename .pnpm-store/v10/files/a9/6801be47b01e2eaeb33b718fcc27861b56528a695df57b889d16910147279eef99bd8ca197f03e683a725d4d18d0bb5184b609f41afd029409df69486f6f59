/// <reference types="node"/>
import {ListenOptions} from 'net';

declare namespace getPort {
	interface Options extends Omit<ListenOptions, 'port'> {
		/**
		A preferred port or an iterable of preferred ports to use.
		*/
		readonly port?: number | Iterable<number>;

		/**
		The host on which port resolution should be performed. Can be either an IPv4 or IPv6 address.
		*/
		readonly host?: string;
	}
}

declare const getPort: {
	/**
	Get an available TCP port number.

	@returns Port number.

	@example
	```
	import getPort = require('get-port');

	(async () => {
		console.log(await getPort());
		//=> 51402

		// Pass in a preferred port
		console.log(await getPort({port: 3000}));
		// Will use 3000 if available, otherwise fall back to a random port

		// Pass in an array of preferred ports
		console.log(await getPort({port: [3000, 3001, 3002]}));
		// Will use any element in the preferred ports array if available, otherwise fall back to a random port
	})();
	```
	*/
	(options?: getPort.Options): Promise<number>;

	/**
	Make a range of ports `from`...`to`.

	@param from - First port of the range. Must be in the range `1024`...`65535`.
	@param to - Last port of the range. Must be in the range `1024`...`65535` and must be greater than `from`.
	@returns The ports in the range.

	@example
	```
	import getPort = require('get-port');

	(async () => {
		console.log(await getPort({port: getPort.makeRange(3000, 3100)}));
		// Will use any port from 3000 to 3100, otherwise fall back to a random port
	})();
	```
	*/
	makeRange(from: number, to: number): Iterable<number>;
};

export = getPort;
