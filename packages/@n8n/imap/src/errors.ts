export abstract class ImapError extends Error {}

/** Error thrown when a connection attempt has timed out */
export class ConnectionTimeoutError extends ImapError {
	constructor(
		/** timeout in milliseconds that the connection waited before timing out */
		readonly timeout?: number,
	) {
		let message = 'connection timed out';
		if (timeout) {
			message += `. timeout = ${timeout} ms`;
		}
		super(message);
	}
}

export class ConnectionClosedError extends ImapError {
	constructor() {
		super('Connection closed unexpectedly');
	}
}

export class ConnectionEndedError extends ImapError {
	constructor() {
		super('Connection ended unexpectedly');
	}
}
