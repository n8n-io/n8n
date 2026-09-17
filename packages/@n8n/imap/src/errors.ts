export class ConnectionLostError extends Error {
	constructor() {
		super('Connection to the IMAP server was lost');
	}
}

export class ReconnectTimeoutError extends Error {
	constructor() {
		super('Reconnecting to the IMAP server timed out');
	}
}

/** The IMAP error codes worth reacting to arrive on the Error itself, not in its message. */
export const imapErrorCode = (error: Error): string =>
	'code' in error && typeof error.code === 'string' ? error.code.toUpperCase() : 'UNKNOWN';
