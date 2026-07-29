/* eslint-disable no-restricted-syntax */
/* We want the runtime overhead here */

/**
 * Transport protocols supported by the syslog client.
 */
export enum Transport {
	Tcp = 1,
	Udp = 2,
	Tls = 3,
	Unix = 4,
}

/**
 * Syslog facility codes as defined in RFC 5424.
 */
export enum Facility {
	Kernel = 0,
	User = 1,
	Mail = 2,
	System = 3,
	// eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
	Daemon = 3,
	Auth = 4,
	Syslog = 5,
	Lpr = 6,
	News = 7,
	Uucp = 8,
	Cron = 9,
	Authpriv = 10,
	Ftp = 11,
	Audit = 13,
	Alert = 14,
	Local0 = 16,
	Local1 = 17,
	Local2 = 18,
	Local3 = 19,
	Local4 = 20,
	Local5 = 21,
	Local6 = 22,
	Local7 = 23,
}

/**
 * Syslog severity levels as defined in RFC 5424.
 */
export enum Severity {
	Emergency = 0,
	Alert = 1,
	Critical = 2,
	Error = 3,
	Warning = 4,
	Notice = 5,
	Informational = 6,
	Debug = 7,
}
