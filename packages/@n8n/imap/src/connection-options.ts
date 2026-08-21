import type { Config } from 'imap';
import type { ConnectionOptions } from 'tls';

/** Milliseconds allowed to establish the connection and authenticate. */
export const AUTH_TIMEOUT = 20_000;

/** Everything needed to reach an IMAP server. Translated to the driver's own shape internally. */
export interface ImapConnectionOptions {
	host: string;
	port: number;
	/** Implicit TLS, as on port 993. A plain connection is never upgraded in place. */
	secure: boolean;
	user: string;
	password: string;
	allowUnauthorizedCerts?: boolean;
	/** Milliseconds allowed to establish the connection and authenticate. */
	authTimeout?: number;
}

export function toImapOptions(options: ImapConnectionOptions): Config {
	const host = options.host.trim();
	const tlsOptions: ConnectionOptions = {};

	if (options.allowUnauthorizedCerts) tlsOptions.rejectUnauthorized = false;
	if (options.secure) tlsOptions.servername = host;

	return {
		host,
		port: options.port,
		tls: options.secure,
		user: options.user,
		password: options.password,
		authTimeout: options.authTimeout ?? AUTH_TIMEOUT,
		...(Object.keys(tlsOptions).length > 0 && { tlsOptions }),
	};
}
