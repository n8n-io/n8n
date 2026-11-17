/**
 * A reference implementation of the `sql` effect (spec 9.10) for tests, on
 * node-postgres. It sends each value as a bind value with the parameter type
 * of the spec, reads each column as text and maps it to JSON by its type, and
 * checks every statement (Parse and Describe) before it runs one. So a limit
 * marker means that nothing ran, as in the runtime.
 *
 * node-postgres gives the `types` of a query to the Parse message as the
 * parameter types, and asks the same object for the column parsers. The
 * reference passes an array of type ids with a `getTypeParser` that keeps the
 * text, so no cast is added to a statement.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SqlError, SqlFailure, SqlResult, SqlRows } from '../../sdk/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
// node-postgres is an untyped CommonJS build here; this is test code.
type Pg = any;
type Client = any;

let pgModule: Pg | undefined;

function pg(): Pg {
	pgModule ??= createRequire(join(nodesBase, 'package.json'))('pg');
	return pgModule;
}

const INT4 = 23;
const INT8 = 20;
const NUMERIC = 1700;
const BOOL = 16;

/** Column types that have no exact native form in the first pass (spec 9.10). */
const NOT_NATIVE = new Set([
	600, 718, 1186, 651, 1000, 1001, 1005, 1007, 1028, 1016, 1017, 1021, 1022, 1231, 1014, 1015, 1008,
	1009, 1040, 1041, 1115, 1182, 1185, 1187, 199, 3807, 3907, 2951, 791, 1183, 1270,
]);
const ERROR_FIELDS = [
	'length',
	'severity',
	'code',
	'detail',
	'hint',
	'position',
	'internalPosition',
	'internalQuery',
	'where',
	'schema',
	'table',
	'column',
	'dataType',
	'constraint',
	'file',
	'line',
	'routine',
] as const;

export interface SqlReferenceOptions {
	/** `--sql-timestamp-zone utc` of the runtime: a `timestamp` column is a time in UTC. */
	timestampZone?: 'utc';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function limit(text: string, marker: string): Error {
	return new Error(`sql: ${text} (limit: ${marker})`);
}

function sqlError(error: unknown): SqlError {
	const source: Record<string, unknown> = isRecord(error)
		? error
		: error instanceof Error
			? { ...error, message: error.message }
			: { message: String(error) };
	const out: SqlError = {
		message: error instanceof Error ? error.message : String(source.message),
	};
	for (const field of ERROR_FIELDS) {
		const value = error instanceof Error ? Reflect.get(error, field) : source[field];
		if (value !== undefined && value !== null) Object.assign(out, { [field]: value });
	}
	return out;
}

/** The parameter type that the runtime declares for a bind value. */
function parameterType(value: unknown): number {
	if (typeof value === 'boolean') return BOOL;
	if (typeof value !== 'number') return 0;
	const text = String(value);
	if (!/^-?\d+$/.test(text)) return NUMERIC;
	const n = BigInt(text);
	if (n >= -2147483648n && n <= 2147483647n) return INT4;
	if (n >= -9223372036854775808n && n <= 9223372036854775807n) return INT8;
	return NUMERIC;
}

function parameterText(value: unknown): string | null {
	if (value === null) return null;
	if (typeof value === 'boolean') return value ? 't' : 'f';
	return String(value);
}

/** `new Date(text).toISOString()`, or the text when it is not a date, as the v1 node. */
function isoText(text: string): string {
	const date = new Date(text);
	return isNaN(date.getTime()) ? text : date.toISOString();
}

function columnValue(text: string | null, type: number, request: Record<string, unknown>): unknown {
	if (text === null) return null;
	const numbers = request.largeNumbers === 'numbers';
	const finite = (n: number) => (Number.isFinite(n) ? n : null);
	switch (type) {
		case 16:
			return text === 't';
		case 21:
		case 23:
		case 26:
			return parseInt(text, 10);
		case 700:
		case 701:
			return finite(parseFloat(text));
		case 20:
			return numbers ? parseInt(text, 10) : text;
		case 1700:
			return numbers ? finite(parseFloat(text)) : text;
		case 114:
		case 3802:
			return JSON.parse(text);
		case 17:
			return { type: 'Buffer', data: [...Buffer.from(text.slice(2), 'hex')] };
		case 1184:
		case 1114:
			return isoText(text);
		default:
			return text;
	}
}

interface Described {
	fields?: Array<{ name: string; dataTypeID: number }>;
	error?: SqlError;
}

/** Parse and Describe of one statement, without a run: a submittable of node-postgres. */
async function describe(client: Client, text: string, types: number[]): Promise<Described> {
	return await new Promise<Described>((resolve) => {
		const out: Described = {};
		client.query({
			submit(connection: any) {
				connection.parse({ text, types });
				connection.describe({ type: 'S', name: '' });
				connection.sync();
			},
			handleRowDescription(message: any) {
				out.fields = message.fields;
			},
			// The client drops a query that failed: the ready message does not come here.
			handleError(error: unknown) {
				out.error = sqlError(error);
				resolve(out);
			},
			handleReadyForQuery() {
				resolve(out);
			},
			handleDataRow() {},
			handleCommandComplete() {},
			handleEmptyQuery() {},
		});
	});
}

/** The limit of a statement that has no exact native form, from its description. */
function limitOf(
	text: string,
	described: Described,
	request: Record<string, unknown>,
	options: SqlReferenceOptions,
): Error | undefined {
	const error = described.error;
	if (error) {
		const multiple = error.message.includes(
			'cannot insert multiple commands into a prepared statement',
		);
		const atVariable = error.code === '42601' && text[Number(error.position ?? 0) - 1] === '$';
		// A bind value where the server takes a literal only: v1 writes the literal.
		if (multiple || atVariable || error.code === '42P18' || error.code === '42P02') {
			return limit(`the statement has no form with bind values: ${error.message}`, 'sql-statement');
		}
		return undefined;
	}
	for (const field of described.fields ?? []) {
		const type = field.dataTypeID;
		const dated = type === 1082 && request.dates === 'legacy';
		const zoned = type === 1114 && options.timestampZone !== 'utc';
		if (NOT_NATIVE.has(type) || dated || zoned) {
			return limit(`the column "${field.name}" has the type ${type}`, 'sql-type');
		}
	}
	return undefined;
}

function checkRequest(
	request: Record<string, unknown>,
): Array<{ text: string; values: unknown[] }> {
	if (request.dialect !== 'postgres') throw new Error('sql: the dialect must be postgres');
	if (typeof request.credential !== 'string') throw new Error('sql: the call has no credential');
	const list = request.statements;
	if (!Array.isArray(list) || list.length === 0 || list.length > 256) {
		throw new Error('sql: the call needs 1 to 256 statements');
	}
	return list.map((statement: unknown) => {
		if (!isRecord(statement) || typeof statement.text !== 'string') {
			throw new Error('sql: a statement has no text');
		}
		const values = statement.values ?? [];
		if (!Array.isArray(values)) throw new Error('sql: the values of a statement are not a list');
		for (const value of values) {
			if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
				throw new Error('sql: a bind value is a string, a number, a boolean or null');
			}
		}
		return { text: statement.text, values };
	});
}

function clientConfig(data: Record<string, unknown>, request: Record<string, unknown>) {
	if (data.sshTunnel === true) throw limit('the credential uses an SSH tunnel', 'sql-credential');
	if (data.caCertificate || data.clientCertificate || data.clientPrivateKey) {
		throw limit('the credential has a certificate', 'sql-credential');
	}
	let ssl: unknown = !['disable', undefined].includes(
		typeof data.ssl === 'string' ? data.ssl : undefined,
	);
	if (data.allowUnauthorizedCerts === true) ssl = { rejectUnauthorized: false };
	return {
		host: data.host,
		port: data.port,
		database: data.database,
		user: data.user,
		password: data.password,
		ssl,
		...(typeof request.connectTimeoutMs === 'number'
			? { connectionTimeoutMillis: request.connectTimeoutMs }
			: {}),
	};
}

/** True when the database of the credential `data` takes a connection. */
export async function databaseReachable(data: Record<string, unknown>): Promise<boolean> {
	const client: Client = new (pg().Client)({
		...clientConfig(data, {}),
		connectionTimeoutMillis: 1500,
	});
	client.on('error', () => {});
	try {
		await client.connect();
		await client.end();
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Runs texts as simple queries, for the tables of a test. It gives the first column of the
 * first row of each text as text, or `error: <message>`.
 */
export async function runTexts(data: Record<string, unknown>, texts: string[]): Promise<string[]> {
	const client: Client = new (pg().Client)(clientConfig(data, {}));
	client.on('error', () => {});
	await client.connect();
	const out: string[] = [];
	try {
		for (const text of texts) {
			try {
				const result = await client.query({ text, rowMode: 'array' });
				out.push(String(result.rows?.[0]?.[0] ?? ''));
			} catch (error) {
				out.push(`error: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	} finally {
		await client.end();
	}
	return out;
}

/** Runs one `sql` effect on the database of the credential `data`. */
export async function runSqlEffect(
	args: unknown,
	data: Record<string, unknown>,
	options: SqlReferenceOptions = {},
): Promise<SqlResult> {
	const request = isRecord(args) ? args : {};
	const statements = checkRequest(request);
	const mode = request.mode ?? 'single';
	if (mode !== 'single' && mode !== 'transaction' && mode !== 'independently') {
		throw new Error('sql: the mode is unknown');
	}
	const client: Client = new (pg().Client)(clientConfig(data, request));
	// An error of an idle connection has no query to fail.
	client.on('error', () => {});
	try {
		await client.connect();
	} catch (error) {
		return { results: [], connect: sqlError(error) };
	}
	try {
		const typed = statements.map((s) => s.values.map(parameterType));
		for (let i = 0; i < statements.length; i++) {
			const found = limitOf(
				statements[i].text,
				await describe(client, statements[i].text, typed[i]),
				request,
				options,
			);
			if (found) throw found;
		}
		const results: Array<SqlRows | SqlFailure> = [];
		const begin = mode === 'transaction' || (mode === 'single' && statements.length > 1);
		if (begin) await client.query('BEGIN');
		let failed = false;
		for (let i = 0; i < statements.length; i++) {
			const types = Object.assign([...typed[i]], {
				getTypeParser: () => (text: string) => text,
			});
			try {
				const result = await client.query({
					text: statements[i].text,
					values: statements[i].values.map(parameterText),
					types,
					queryMode: 'extended',
				});
				const rows = result.rows.map((row: Record<string, string | null>) => {
					const out: Record<string, unknown> = {};
					for (const field of result.fields) {
						out[field.name] = columnValue(row[field.name], field.dataTypeID, request);
					}
					return out;
				});
				results.push({ command: result.command, rowCount: result.rowCount, rows });
			} catch (error) {
				results.push({ error: sqlError(error) });
				if (mode !== 'independently') {
					failed = true;
					break;
				}
			}
		}
		if (begin) await client.query(failed ? 'ROLLBACK' : 'COMMIT');
		return { results };
	} finally {
		await client.end();
	}
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
