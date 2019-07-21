import * as config from '../config';
import * as express from 'express';


/**
 * Displays a message to the user
 *
 * @export
 * @param {string} message The message to display
 * @param {string} [level='log']
 */
export function logOutput(message: string, level = 'log'): void {
	if (level === 'log') {
		console.log(message);
	} else if (level === 'error') {
		console.error(message);
	}
}


/**
 * Returns the base URL n8n is reachable from
 *
 * @export
 * @returns {string}
 */
export function getBaseUrl(): string {
	const protocol = config.get('protocol') as string;
	const host = config.get('host') as string;
	const port = config.get('port') as number;

	if (protocol === 'http' && port === 80 || protocol === 'https' && port === 443) {
		return `${protocol}://${host}/`;
	}
	return `${protocol}://${host}:${port}/`;
}


/**
 * Returns the session id if one is set
 *
 * @export
 * @param {express.Request} req
 * @returns {(string | undefined)}
 */
export function getSessionId(req: express.Request): string | undefined {
	return req.headers.sessionid as string | undefined;
}
