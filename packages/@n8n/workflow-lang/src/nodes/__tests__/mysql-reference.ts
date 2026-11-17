/**
 * A reference implementation of the `sql` effect for `dialect: 'mysql'` (spec 9.11), on
 * mysql2: the driver of the v1 MySQL node, with the connection options of that node. The
 * runtime must give the same result for the same request.
 *
 * The v1 node sends only text (`COM_QUERY`), so each statement has `simple: true`. The JSON
 * of a column is what mysql2 gives with the options of v1, written as JSON.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SqlError, SqlResult, SqlRows } from '../../sdk/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '..', '..', '..', '..', '..', 'nodes-base');

interface Field {
	name: string;
	columnType: number;
}

interface Connection {
	query(text: string): Promise<[unknown, unknown]>;
	end(): Promise<void>;
	destroy(): void;
	on(event: 'error', listener: () => void): void;
}

interface Mysql2 {
	createConnection(config: Record<string, unknown>): Promise<Connection>;
}

let mysqlModule: Mysql2 | undefined;
function mysql(): Mysql2 {
	mysqlModule ??= createRequire(join(nodesBase, 'package.json'))('mysql2/promise');
	if (!mysqlModule) throw new Error('mysql2 is not there');
	return mysqlModule;
}

/** Protocol ids of the column types without a native form. */
const GEOMETRY = 255;
const VECTOR = 242;
const DATE_TYPES = [7, 10, 12, 14];

type Entry = SqlResult['results'][number] | { skipped: true };

export interface MysqlResult {
	results: Entry[];
	connect?: SqlError;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function limit(text: string, marker: string): Error {
	return new Error(`sql: ${text} (limit: ${marker})`);
}

/** The fields of an error as mysql2 names them. `errno` only for an error of the server. */
function sqlError(error: unknown): SqlError {
	if (!isRecord(error)) return { message: String(error) };
	const out: SqlError = { message: String(error.message) };
	if (typeof error.code === 'string') out.code = error.code;
	if (typeof error.sqlMessage === 'string') {
		if (typeof error.errno === 'number') out.errno = error.errno;
		if (typeof error.sqlState === 'string') out.sqlState = error.sqlState;
		out.sqlMessage = error.sqlMessage;
	}
	return out;
}

interface Statement {
	text: string;
	group?: number;
}

function checkRequest(request: Record<string, unknown>): Statement[] {
	if (request.dialect !== 'mysql') throw new Error('sql: the dialect must be mysql');
	if (typeof request.credential !== 'string') throw new Error('sql: the call has no credential');
	const list = request.statements;
	if (!Array.isArray(list) || list.length === 0 || list.length > 256) {
		throw new Error('sql: the call needs 1 to 256 statements');
	}
	return list.map((statement: unknown) => {
		if (!isRecord(statement) || typeof statement.text !== 'string') {
			throw new Error('sql: a statement has no text');
		}
		if (statement.simple !== true || statement.values !== undefined) {
			throw new Error('sql: a MySQL statement has `simple: true` and no values');
		}
		const group = statement.group;
		if (
			group !== undefined &&
			!(typeof group === 'number' && Number.isInteger(group) && group >= 0)
		) {
			throw new Error('sql: the group of a statement is an integer from 0');
		}
		return { text: statement.text, ...(typeof group === 'number' ? { group } : {}) };
	});
}

/** `createPool` of the v1 node (`transport/index.ts`), from the credential and the request. */
function clientConfig(data: Record<string, unknown>, request: Record<string, unknown>) {
	if (data.sshTunnel === true) throw limit('the credential uses an SSH tunnel', 'sql-credential');
	if (
		data.ssl === true &&
		(data.caCertificate || data.clientCertificate || data.clientPrivateKey)
	) {
		throw limit('the credential has a certificate', 'sql-credential');
	}
	return {
		host: data.host,
		port: data.port,
		database: data.database,
		user: data.user,
		password: data.password,
		multipleStatements: true,
		supportBigNumbers: true,
		decimalNumbers: request.decimals === 'numbers',
		dateStrings: request.dates !== 'legacy',
		bigNumberStrings: request.largeNumbers === 'text',
		...(data.ssl === true ? { ssl: {} } : {}),
		...(typeof request.connectTimeoutMs === 'number'
			? { connectTimeout: request.connectTimeoutMs }
			: {}),
	};
}

async function connect(config: Record<string, unknown>): Promise<Connection> {
	const connection = await mysql().createConnection(config);
	// An error of an idle connection has no query to fail.
	connection.on('error', () => {});
	return connection;
}

/** True when the database of the credential `data` takes a connection. */
export async function mysqlReachable(data: Record<string, unknown>): Promise<boolean> {
	try {
		const connection = await connect({ ...clientConfig(data, {}), connectTimeout: 1500 });
		await connection.end();
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Runs texts, for the tables of a test. It gives the first column of the first row of each
 * text as text, or `error: <message>`.
 */
export async function runMysqlTexts(
	data: Record<string, unknown>,
	texts: string[],
): Promise<string[]> {
	const connection = await connect(clientConfig(data, {}));
	const out: string[] = [];
	try {
		for (const text of texts) {
			try {
				const [rows] = await connection.query(text);
				const row: unknown = Array.isArray(rows) ? rows[0] : undefined;
				out.push(isRecord(row) ? String(Object.values(row)[0] ?? '') : '');
			} catch (error) {
				out.push(`error: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	} finally {
		await connection.end();
	}
	return out;
}

function isField(value: unknown): value is Field {
	return isRecord(value) && typeof value.name === 'string' && typeof value.columnType === 'number';
}

/** The results of one text, as mysql2 gives them: one, or a list when the text gave several. */
function resultsOf(result: unknown, fields: unknown): Array<{ result: unknown; fields: Field[] }> {
	const many =
		Array.isArray(fields) &&
		fields.length > 0 &&
		(fields[0] === undefined || Array.isArray(fields[0]));
	if (!many) {
		return [{ result, fields: Array.isArray(fields) ? fields.filter(isField) : [] }];
	}
	const list: unknown[] = Array.isArray(result) ? result : [];
	return list.map((entry, index) => {
		const own: unknown = Array.isArray(fields) ? fields[index] : undefined;
		return { result: entry, fields: Array.isArray(own) ? own.filter(isField) : [] };
	});
}

/** Runs one `sql` effect on the database of the credential `data`. */
export async function runMysqlEffect(
	args: unknown,
	data: Record<string, unknown>,
): Promise<MysqlResult> {
	const request = isRecord(args) ? args : {};
	const statements = checkRequest(request);
	const mode = request.mode ?? 'single';
	if (mode !== 'single' && mode !== 'transaction' && mode !== 'independently') {
		throw new Error('sql: the mode is unknown');
	}
	const config = clientConfig(data, request);
	let connection: Connection;
	try {
		connection = await connect(config);
	} catch (error) {
		return { results: [], connect: sqlError(error) };
	}
	// A command that can have changed the database has completed: no marker after that.
	let committed = false;
	const typeLimit = (fields: Field[]): Error | undefined => {
		for (const field of fields) {
			const dated = request.dates === 'legacy' && DATE_TYPES.includes(field.columnType);
			if (field.columnType === GEOMETRY || field.columnType === VECTOR || dated) {
				const text = `the column "${field.name}" has the type ${field.columnType}`;
				return committed ? new Error(`sql: ${text} (limit)`) : limit(text, 'sql-type');
			}
		}
		return undefined;
	};
	const run = async (text: string): Promise<Entry> => {
		let answer: [unknown, unknown];
		try {
			answer = await connection.query(text);
		} catch (error) {
			return { error: sqlError(error) };
		}
		const sets: SqlRows[] = [];
		for (const { result, fields } of resultsOf(answer[0], answer[1])) {
			if (Array.isArray(result)) {
				const found = typeLimit(fields);
				if (found) throw found;
				const rows = JSON.parse(JSON.stringify(result));
				sets.push({ command: 'SELECT', rowCount: rows.length, rows });
				continue;
			}
			committed = true;
			const header = isRecord(result) ? result : {};
			const affectedRows = header.affectedRows;
			const insertId = header.insertId;
			sets.push({
				command: 'OK',
				rowCount: typeof affectedRows === 'number' ? affectedRows : null,
				rows: [],
				ok: {
					affectedRows:
						typeof affectedRows === 'number' || typeof affectedRows === 'string' ? affectedRows : 0,
					insertId: typeof insertId === 'number' || typeof insertId === 'string' ? insertId : 0,
					info: String(header.info ?? ''),
					serverStatus: Number(header.serverStatus ?? 0),
					warningStatus: Number(header.warningStatus ?? 0),
				},
			});
		}
		return { sets };
	};
	try {
		const results: Entry[] = [];
		if (mode === 'transaction') {
			try {
				await connection.query('START TRANSACTION');
			} catch (error) {
				return { results: [{ error: sqlError(error) }] };
			}
		}
		const failedGroups: number[] = [];
		for (const statement of statements) {
			if (statement.group !== undefined && failedGroups.includes(statement.group)) {
				results.push({ skipped: true });
				continue;
			}
			let entry: Entry;
			try {
				entry = await run(statement.text);
			} catch (error) {
				if (mode === 'transaction') await connection.query('ROLLBACK');
				throw error;
			}
			results.push(entry);
			if (!('error' in entry)) continue;
			if (mode === 'transaction') await connection.query('ROLLBACK');
			if (mode !== 'independently') return { results };
			if (statement.group !== undefined) failedGroups.push(statement.group);
		}
		if (mode === 'transaction') {
			try {
				await connection.query('COMMIT');
			} catch (error) {
				results.push({ error: sqlError(error) });
			}
		}
		return { results };
	} finally {
		await connection.end().catch(() => connection.destroy());
	}
}
