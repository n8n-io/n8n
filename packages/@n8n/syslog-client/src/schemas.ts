import { z } from 'zod';

import { Facility, Severity, Transport } from './constants';

/**
 * Helper to dynamically create Zod schema for enum values.
 * Filters out string keys that regular enums create at runtime.
 */
const createEnumSchema = (enumObject: object, name: string) => {
	const values = Object.values(enumObject).filter((val) => typeof val === 'number');
	return z.number().refine((val) => values.includes(val), {
		message: `Invalid ${name} value. Must be one of: ${values.join(', ')}`,
	});
};

/**
 * Zod schema for validating ClientOptions.
 */
export const clientOptionsSchema = z.object({
	syslogHostname: z.string().optional(),
	port: z.number().int().positive().max(65535).optional(),
	tcpTimeout: z.number().int().positive().optional(),
	facility: createEnumSchema(Facility, 'facility').optional(),
	severity: createEnumSchema(Severity, 'severity').optional(),
	rfc3164: z.boolean().optional(),
	appName: z.string().max(48).optional(), // RFC 5424 limit
	dateFormatter: z.function().args(z.date()).returns(z.string()).optional(),
	udpBindAddress: z.string().ip().optional(),
	transport: createEnumSchema(Transport, 'transport').optional(),
	tlsCA: z
		.union([z.string(), z.array(z.string()), z.instanceof(Buffer), z.array(z.instanceof(Buffer))])
		.optional(),
});

/**
 * Zod schema for validating LogOptions.
 */
export const logOptionsSchema = z.object({
	facility: createEnumSchema(Facility, 'facility').optional(),
	severity: createEnumSchema(Severity, 'severity').optional(),
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
