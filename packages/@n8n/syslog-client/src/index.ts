/**
 * @n8n/syslog-client
 *
 * A syslog client for Node.js supporting UDP, TCP, TLS, and Unix socket transports.
 * Supports both RFC 3164 and RFC 5424 syslog message formats.
 *
 * Based upon the great work done in:
 * https://github.com/paulgrove/node-syslog-client
 */

export { SyslogClient } from './client';
export { createClient } from './factory';
export { Facility, Severity, Transport } from './constants';
export type { ClientOptions, DateFormatter, LogOptions, SyslogCallback } from './types';
export {
	ConnectionError,
	SyslogClientError,
	TimeoutError,
	TransportError,
	ValidationError,
} from './errors';
