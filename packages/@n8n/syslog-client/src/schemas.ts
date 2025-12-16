import { z } from 'zod';

import { Facility, Severity, Transport } from './constants';

/**
 * Valid Transport values.
 * Must be manually maintained because const enums don't exist at runtime.
 */
const TRANSPORT_VALUES = [
	Transport.Tcp, // 1
	Transport.Udp, // 2
	Transport.Tls, // 3
	Transport.Unix, // 4
] as const;

/**
 * Valid Facility values.
 * Must be manually maintained because const enums don't exist at runtime.
 */
const FACILITY_VALUES = [
	Facility.Kernel, // 0
	Facility.User, // 1
	Facility.Mail, // 2
	Facility.System, // 3
	Facility.Auth, // 4
	Facility.Syslog, // 5
	Facility.Lpr, // 6
	Facility.News, // 7
	Facility.Uucp, // 8
	Facility.Cron, // 9
	Facility.Authpriv, // 10
	Facility.Ftp, // 11
	Facility.Audit, // 13
	Facility.Alert, // 14
	Facility.Local0, // 16
	Facility.Local1, // 17
	Facility.Local2, // 18
	Facility.Local3, // 19
	Facility.Local4, // 20
	Facility.Local5, // 21
	Facility.Local6, // 22
	Facility.Local7, // 23
] as const;

/**
 * Valid Severity values.
 * Must be manually maintained because const enums don't exist at runtime.
 */
const SEVERITY_VALUES = [
	Severity.Emergency, // 0
	Severity.Alert, // 1
	Severity.Critical, // 2
	Severity.Error, // 3
	Severity.Warning, // 4
	Severity.Notice, // 5
	Severity.Informational, // 6
	Severity.Debug, // 7
] as const;

/**
 * Helper to create Zod schema for const enum values.
 */
const createEnumSchema = (values: readonly number[], name: string) =>
	z.number().refine((val) => values.includes(val), {
		message: `Invalid ${name} value. Must be one of: ${values.join(', ')}`,
	});

/**
 * Zod schema for validating ClientOptions.
 */
export const clientOptionsSchema = z.object({
	syslogHostname: z.string().optional(),
	port: z.number().int().positive().max(65535).optional(),
	tcpTimeout: z.number().int().positive().optional(),
	facility: createEnumSchema(FACILITY_VALUES, 'facility').optional(),
	severity: createEnumSchema(SEVERITY_VALUES, 'severity').optional(),
	rfc3164: z.boolean().optional(),
	appName: z.string().max(48).optional(), // RFC 5424 limit
	dateFormatter: z.function().args(z.date()).returns(z.string()).optional(),
	udpBindAddress: z.string().ip().optional(),
	transport: createEnumSchema(TRANSPORT_VALUES, 'transport').optional(),
	tlsCA: z
		.union([z.string(), z.array(z.string()), z.instanceof(Buffer), z.array(z.instanceof(Buffer))])
		.optional(),
});

/**
 * Zod schema for validating LogOptions.
 */
export const logOptionsSchema = z.object({
	facility: createEnumSchema(FACILITY_VALUES, 'facility').optional(),
	severity: createEnumSchema(SEVERITY_VALUES, 'severity').optional(),
	rfc3164: z.boolean().optional(),
	appName: z.string().max(48).optional(),
	syslogHostname: z.string().optional(),
	timestamp: z.instanceof(Date).optional(),
	msgid: z.string().optional(),
});

/**
 * Inferred type from clientOptionsSchema for consistency.
 */
export type ValidatedClientOptions = z.infer<typeof clientOptionsSchema>;

/**
 * Inferred type from logOptionsSchema for consistency.
 */
export type ValidatedLogOptions = z.infer<typeof logOptionsSchema>;
