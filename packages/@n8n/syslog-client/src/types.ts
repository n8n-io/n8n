import type * as dgram from 'dgram';
import type * as net from 'net';
import type * as tls from 'tls';

import type { Facility, Severity, Transport } from './constants';

/**
 * Callback type for legacy API support.
 */
export type SyslogCallback = (error?: Error) => void;

/**
 * Date formatter function type.
 * Takes a Date object and returns a formatted string.
 */
export type DateFormatter = (date: Date) => string;

/**
 * Options for creating a syslog client.
 */
export interface ClientOptions {
	/**
	 * Hostname to use in syslog messages.
	 * @default os.hostname()
	 */
	syslogHostname?: string;

	/**
	 * Port number for TCP/TLS/UDP connections.
	 * @default 514
	 */
	port?: number;

	/**
	 * TCP connection timeout in milliseconds.
	 * @default 10000
	 */
	tcpTimeout?: number;

	/**
	 * Default facility for log messages.
	 * @default Facility.Local0
	 */
	facility?: Facility;

	/**
	 * Default severity for log messages.
	 * @default Severity.Informational
	 */
	severity?: Severity;

	/**
	 * Use RFC 3164 format (true) or RFC 5424 format (false).
	 * @default true
	 */
	rfc3164?: boolean;

	/**
	 * Application name for RFC 5424 format.
	 * @default process.title
	 */
	appName?: string;

	/**
	 * Custom date formatter function.
	 * @default Date.prototype.toISOString
	 */
	dateFormatter?: DateFormatter;

	/**
	 * UDP bind address for outgoing datagrams.
	 * If not specified, node will bind to 0.0.0.0.
	 */
	udpBindAddress?: string;

	/**
	 * Transport protocol to use.
	 * @default Transport.Udp
	 */
	transport?: Transport;

	/**
	 * TLS CA certificate(s). Only used when transport is Transport.Tls.
	 */
	tlsCA?: string | string[] | Buffer | Buffer[];
}

/**
 * Options for individual log messages.
 * These override the client defaults for a single message.
 */
export interface LogOptions {
	/**
	 * Override facility for this message.
	 */
	facility?: Facility;

	/**
	 * Override severity for this message.
	 */
	severity?: Severity;

	/**
	 * Override RFC format for this message.
	 */
	rfc3164?: boolean;

	/**
	 * Override app name for this message.
	 */
	appName?: string;

	/**
	 * Override syslog hostname for this message.
	 */
	syslogHostname?: string;

	/**
	 * Custom timestamp for the message.
	 * Useful for back-dating messages based on external timestamps.
	 */
	timestamp?: Date;

	/**
	 * Message ID for RFC 5424 format.
	 * @default "-"
	 */
	msgid?: string;
}

/**
 * Internal type for resolved log options with all defaults applied.
 */
export interface ResolvedLogOptions {
	facility: Facility;
	severity: Severity;
	rfc3164: boolean;
	appName: string;
	syslogHostname: string;
	timestamp?: Date;
	msgid?: string;
}

/**
 * Union type for all possible transport implementations.
 */
export type TransportConnection = dgram.Socket | net.Socket | tls.TLSSocket;
