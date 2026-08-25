import type { ImapFlowOptions } from 'imapflow';
import { isIP } from 'net';
import type { ConnectionOptions } from 'tls';

/** Milliseconds allowed to establish the connection and read the greeting. */
const AUTH_TIMEOUT = 20_000;

/** How often IDLE is broken and restarted, and so the longest a healthy connection stays silent. */
const IDLE_INTERVAL = 120_000;

/**
 * How long a silent server is tolerated once IDLE has been broken. imapflow spends the first
 * timeout on a recovery NOOP, so a dead connection is normally reported after two of them.
 */
const INACTIVITY_TIMEOUT = 120_000;

/** Everything needed to reach an IMAP server. Translated to the driver's own shape internally. */
export interface ImapConnectionOptions {
	host: string;
	port: number;
	/** Implicit TLS, as on port 993. A plain connection is never upgraded in place. */
	secure: boolean;
	user: string;
	password: string;
	allowUnauthorizedCerts?: boolean;
	/** How often IDLE is broken and restarted. */
	maxIdleTime?: number;
	/** How long a silent server is tolerated once IDLE has been broken. */
	socketTimeout?: number;
	/** Milliseconds allowed to establish the connection and read the greeting. */
	authTimeout?: number;
}

export function toImapFlowOptions(options: ImapConnectionOptions): ImapFlowOptions {
	const host = options.host.trim();
	const tls: ConnectionOptions = {};

	if (options.allowUnauthorizedCerts) tls.rejectUnauthorized = false;
	// SNI carries a hostname; node rejects an IP outright since 24.18.1.
	if (options.secure && !isIP(host)) tls.servername = host;

	const authTimeout = options.authTimeout ?? AUTH_TIMEOUT;

	return {
		host,
		port: options.port,
		secure: options.secure,
		// Matches what the trigger has always done; a plain connection stays plain.
		doSTARTTLS: false,
		auth: { user: options.user, pass: options.password },
		connectionTimeout: authTimeout,
		greetingTimeout: authTimeout,
		maxIdleTime: options.maxIdleTime ?? IDLE_INTERVAL,
		socketTimeout: options.socketTimeout ?? INACTIVITY_TIMEOUT,
		logger: false,
		...(Object.keys(tls).length > 0 && { tls }),
	};
}
