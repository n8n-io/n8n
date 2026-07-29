import type { DateFormatter, ResolvedLogOptions } from './types';

/**
 * Default date formatter for RFC 5424 format.
 * Returns ISO 8601 timestamp.
 */
export const defaultDateFormatter: DateFormatter = (date) => date.toISOString();

/**
 * Format RFC 3164 timestamp.
 * Example: "Jan 15 08:30:00"
 *
 * Note: BSD syslog requires leading 0's in day to be a space.
 */
export const formatRfc3164Timestamp = (date: Date): string => {
	const elements = date.toString().split(/\s+/);
	const month = elements[1];
	let day = elements[2];
	const time = elements[4];

	// BSD syslog requires leading 0's to be a space
	if (day[0] === '0') {
		day = ' ' + day.substring(1);
	}

	return `${month} ${day} ${time}`;
};

/**
 * Build formatted syslog message according to RFC 3164 or RFC 5424.
 *
 * @param message - The message to format
 * @param options - Resolved log options with all defaults applied
 * @param dateFormatter - Date formatter function
 * @returns Buffer containing the formatted syslog message
 */
export const buildFormattedMessage = (
	message: string,
	options: ResolvedLogOptions,
	dateFormatter: DateFormatter,
): Buffer => {
	const date = options.timestamp ?? new Date();
	const pri = options.facility * 8 + options.severity;
	const newline = message.endsWith('\n') ? '' : '\n';

	let formattedMessage: string;

	if (options.rfc3164) {
		// RFC 3164 format: <PRI>TIMESTAMP HOSTNAME MESSAGE
		const timestamp = formatRfc3164Timestamp(date);
		formattedMessage = `<${pri}>${timestamp} ${options.syslogHostname} ${message}${newline}`;
	} else {
		// RFC 5424 format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID SD MESSAGE
		const timestamp = dateFormatter(date);
		const msgid = options.msgid ?? '-';
		formattedMessage = `<${pri}>1 ${timestamp} ${options.syslogHostname} ${options.appName} ${process.pid} ${msgid} - ${message}${newline}`;
	}

	return Buffer.from(formattedMessage);
};

/**
 * Check if an address is IPv6.
 * Simple check based on presence of colons.
 *
 * @param address - IP address to check
 * @returns true if IPv6, false otherwise
 */
export const isIPv6 = (address: string): boolean => address.includes(':');
