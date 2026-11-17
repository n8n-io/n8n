/**
 * Compiled library node: a hand port of `n8n-nodes-base.extractFromFile` (versions 1 to 1.2)
 * for the operations of `actions/moveTo.operation.ts` that need no parser library: `text`,
 * `xml` (the text of the file), `fromJson` and `binaryToPropery`.
 *
 * The bytes of a file. An entry with inline data that is plain ASCII is decoded here: each
 * encoding that `chardet` can find for such bytes, and each encoding of the allow list
 * below, gives the same text. All other files go to the `binaryData` service of n8n
 * (`services/binary-data.ts`), which reads a stored file and decodes as the v1 node does.
 *
 * What has no exact form ends with the mark `RUNS_IN_HOST`: the workflow then runs the v1
 * node in the fallback host, in the same run. That is: a file of more than 262,144 bytes,
 * an encoding that the service does not decode exactly, a field name or a destination key
 * that lodash reads as a path, and a binary field that is not a name.
 */
import { defineNode, operationError, type Item } from '@n8n/workflow-lang';

interface ExtractOptions {
	encoding?: string;
	stripBOM?: boolean;
	keepSource?: string;
	delimiter?: unknown;
	fromLine?: unknown;
	maxRowCount?: unknown;
	enableBOM?: unknown;
	headerRow?: unknown;
	includeEmptyCells?: unknown;
}

interface ExtractParameters {
	operation?: string;
	binaryPropertyName?: unknown;
	destinationKey?: string;
	options?: ExtractOptions;
	/** The index of the item, for the error texts of `assertBinaryData`. */
	itemIndex?: number;
}

interface ReadAnswer {
	text?: string;
	data?: string;
	host?: string;
}

type Json = Record<string, unknown>;

/** `RUNS_IN_HOST` of the converter: the workflow runs the host form of the node in the same run. */
const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';

/** `BINARY_DATA_MAX_BYTES` of the `binaryData` service. */
const MAX_BYTES = 262144;
/** The base64 text of `MAX_BYTES` bytes. */
const MAX_BASE64 = 349528;

/** Encoding names that give the text of ASCII bytes as it is. */
const ASCII_NAMES = ['utf8', 'utf-8', 'UTF-8', 'ascii', 'latin1'];

function isJson(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inHost(reason: string): Error {
	return new Error(`Extract From File: ${reason}. ${RUNS_IN_HOST}`);
}

/** True when lodash `set` and `unset` read the key as one property name. */
function plainKey(key: string): boolean {
	if (key.includes('.') || key.includes('[') || key.includes(']')) return false;
	return key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && key !== '$binary';
}

/** The entry of the binary field, with the two errors of n8n-core's `assertBinaryData`. */
function fileOf(item: Json, name: string, index: number): Json {
	const files = item.$binary;
	if (!isJson(files)) {
		throw operationError(
			`This operation expects the node's input data to contain a binary file '${name}', but none was found [item ${index}]`,
			'Make sure that the previous node outputs a binary file',
		);
	}
	const file = files[name];
	if (file === undefined) {
		throw operationError(
			`The item has no binary field '${name}' [item ${index}]`,
			'Check that the parameter where you specified the input binary field name is correct, and that it matches a field in the binary input',
		);
	}
	if (!isJson(file)) throw inHost('the binary field is not a binary entry');
	return file;
}

/** The rows of a CSV text, or the reason why the text has no exact form here. */
interface CsvRows {
	rows: string[][];
	host?: string;
}

/**
 * csv-parse 7 (`lib/api/index.js`, `parse`) as the v1 node sets it: one delimiter, the quote
 * and the escape `"`, the record delimiter that the text shows first (`\r\n`, `\n` or `\r`),
 * `skip_empty_lines`, `from_line` and `to`. Records are lists of texts; the caller makes the
 * columns. Each error of csv-parse (a quote inside a field, a quote that does not close, a
 * record with another number of fields) is a reason for the host, where v1 gives its error.
 */
function parseCsv(
	text: string,
	delimiter: string,
	fromLine: number,
	to: number,
	columns: boolean,
): CsvRows {
	const rows: string[][] = [];
	const length = text.length;
	let recordDelimiter = '';
	let quoting = false;
	let wasQuoting = false;
	let escaping = false;
	let enabled = fromLine === 1;
	let wasRowDelimiter = false;
	let lines = 1;
	let records = 0;
	let expected = -1;
	let header = columns;
	let field = '';
	let record: string[] = [];
	let stop = false;
	let pos = 0;
	while (pos < length && !stop) {
		if (wasRowDelimiter) {
			lines++;
			wasRowDelimiter = false;
		}
		const chr = text.charAt(pos);
		if (!quoting && recordDelimiter === '') {
			if (chr === '\r' && text.charAt(pos + 1) === '\n') recordDelimiter = '\r\n';
			else if (chr === '\n') recordDelimiter = '\n';
			else if (chr === '\r') recordDelimiter = '\r';
		}
		if (chr === '\r' || chr === '\n') wasRowDelimiter = true;
		let append = true;
		if (escaping) {
			escaping = false;
		} else if (quoting && chr === '"' && text.charAt(pos + 1) === '"') {
			escaping = true;
			append = false;
		} else {
			if (chr === '"') {
				if (quoting) {
					const next = text.charAt(pos + 1);
					let closes = next === '' || next === '\u0000' || next === delimiter;
					if (!closes && recordDelimiter === '') {
						if (next === '\r' && text.charAt(pos + 2) === '\n') recordDelimiter = '\r\n';
						else if (next === '\n') recordDelimiter = '\n';
						else if (next === '\r') recordDelimiter = '\r';
						closes = recordDelimiter !== '';
					} else if (!closes) {
						closes = text.startsWith(recordDelimiter, pos + 1);
					}
					if (!closes) return { rows, host: 'a quote does not end its field' };
					quoting = false;
					wasQuoting = true;
					append = false;
				} else {
					if (field.length !== 0) return { rows, host: 'a quote is inside a field' };
					quoting = true;
					append = false;
				}
			}
			if (append && !quoting) {
				if (recordDelimiter !== '' && text.startsWith(recordDelimiter, pos)) {
					append = false;
					if (!enabled && lines + (wasRowDelimiter ? 1 : 0) >= fromLine) {
						enabled = true;
						field = '';
						wasQuoting = false;
						record = [];
					} else if (!wasQuoting && record.length === 0 && field.length === 0) {
						// `skip_empty_lines`.
					} else {
						if (enabled) record.push(field);
						field = '';
						wasQuoting = false;
						if (!enabled) {
							record = [];
						} else if (header) {
							header = false;
							expected = record.length;
							rows.push(record);
							record = [];
						} else {
							if (expected < 0) expected = record.length;
							if (record.length !== expected) {
								return { rows, host: 'a record has another number of fields' };
							}
							records++;
							rows.push(record);
							record = [];
							if (to !== -1 && records >= to) stop = true;
						}
					}
					pos += recordDelimiter.length - 1;
				} else if (chr === delimiter) {
					append = false;
					if (enabled) record.push(field);
					field = '';
					wasQuoting = false;
				}
			}
		}
		if (append) field += chr;
		pos++;
	}
	if (stop) return { rows };
	if (quoting) return { rows, host: 'a quote does not close' };
	if (wasQuoting || record.length !== 0 || field.length !== 0) {
		if (enabled) {
			record.push(field);
			if (header) {
				rows.push(record);
			} else {
				if (expected < 0) expected = record.length;
				if (record.length !== expected) {
					return { rows, host: 'a record has another number of fields' };
				}
				rows.push(record);
			}
		}
	}
	return { rows };
}

/** True when JavaScript puts the key before the text keys of an object (an array index). */
function indexKey(key: string): boolean {
	if (key === '' || key.length > 10) return false;
	if (key !== '0' && key.charAt(0) === '0') return false;
	for (let i = 0; i < key.length; i++) {
		if (!'0123456789'.includes(key.charAt(i))) return false;
	}
	return true;
}

/** The output items of the `csv` operation (`SpreadsheetFile/v2/fromFile.operation.ts`). */
function csvItems(text: string, options: ExtractOptions): Item[] {
	if (text.includes('�')) throw inHost('the file is not UTF-8 text');
	const delimiter = options.delimiter === undefined ? ',' : options.delimiter;
	if (typeof delimiter !== 'string' || delimiter.length !== 1 || !Ascii.isPrintable(delimiter)) {
		if (delimiter !== '\t') throw inHost('the delimiter is not one ASCII character');
	}
	if (delimiter === '"') throw inHost('the delimiter is the quote');
	let fromLine = 1;
	if (options.fromLine !== undefined) {
		if (typeof options.fromLine !== 'number' || !Number.isInteger(options.fromLine)) {
			throw inHost('the first line is not an integer');
		}
		if (options.fromLine < 1) throw inHost('the first line is less than 1');
		fromLine = options.fromLine;
	}
	let to = -1;
	if (options.maxRowCount !== undefined) {
		if (typeof options.maxRowCount !== 'number') throw inHost('the row count is not a number');
		if (options.maxRowCount > -1) {
			if (!Number.isInteger(options.maxRowCount) || options.maxRowCount < 1) {
				throw inHost('the row count is not a positive integer');
			}
			to = options.maxRowCount;
		}
	}
	if (options.enableBOM !== undefined && typeof options.enableBOM !== 'boolean') {
		throw inHost('the option for the byte order mark is not a boolean');
	}
	if (options.headerRow !== undefined && typeof options.headerRow !== 'boolean') {
		throw inHost('the option for the header row is not a boolean');
	}
	const columns = options.headerRow !== false;
	const body = options.enableBOM === true && text.startsWith('\uFEFF') ? text.slice(1) : text;
	const parsed = parseCsv(body, delimiter, fromLine, to, columns);
	if (parsed.host !== undefined) throw inHost(parsed.host);
	const keep = options.includeEmptyCells ? true : false;
	const out: Item[] = [];
	if (!columns) {
		for (const row of parsed.rows) {
			if (keep) {
				out.push({ row });
			} else {
				const cells: Json = {};
				for (let i = 0; i < row.length; i++) {
					if (row[i] !== '') cells[String(i)] = row[i];
				}
				out.push({ row: cells });
			}
		}
		return out;
	}
	if (parsed.rows.length === 0) return out;
	const names = parsed.rows[0];
	for (const name of names) {
		if (indexKey(name)) throw inHost('a column name is a number');
		if (name === '__proto__') throw inHost('a column name is __proto__');
	}
	for (let r = 1; r < parsed.rows.length; r++) {
		const row = parsed.rows[r];
		const all: Json = {};
		for (let i = 0; i < names.length; i++) all[names[i]] = row[i];
		if (keep) {
			out.push(all);
		} else {
			const cells: Json = {};
			for (const name of Object.keys(all)) {
				if (all[name] !== '') cells[name] = all[name];
			}
			out.push(cells);
		}
	}
	return out;
}

export default defineNode<ExtractParameters>({
	type: 'n8n-nodes-base.extractFromFile',
	version: 1,
	supports: {
		operations: {
			text: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
			xml: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
			fromJson: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
			binaryToPropery: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
			csv: [
				'binaryPropertyName',
				'itemIndex',
				'options',
				'options.delimiter',
				'options.fromLine',
				'options.maxRowCount',
				'options.enableBOM',
				'options.headerRow',
				'options.includeEmptyCells',
				'options.encoding="utf-8"|"utf8"',
			],
		},
	},
	async run(ctx, parameters, items) {
		const out: Item[] = [];
		const list = items ?? [];
		if (list.length === 0) return out;
		const item: Json = list[0];
		const index = parameters.itemIndex ?? 0;
		const operation = parameters.operation ?? '';
		const options = parameters.options ?? {};
		const name = parameters.binaryPropertyName;
		const key = parameters.destinationKey ?? '';
		if (typeof name !== 'string') throw inHost('the binary field is not a name');
		const csv = operation === 'csv';
		// The v1 reader keeps the file extension of the item before. So the text of an error
		// of a later item depends on the items before it.
		if (csv && index > 0 && (!isJson(item.$binary) || item.$binary[name] === undefined)) {
			throw inHost('an item after the first has no file');
		}
		const file = fileOf(item, name, index);
		if (!csv && !plainKey(name)) throw inHost('the name of the binary field is a path');
		if (!csv && !plainKey(key)) throw inHost('the destination key is a path');

		const base64 = operation === 'binaryToPropery';
		// csv-parse reads the bytes as UTF-8 and keeps a byte order mark.
		const encoding = csv ? 'utf8' : options.encoding ? options.encoding : undefined;
		const stored = typeof file.id === 'string' && file.id !== '';
		const data = typeof file.data === 'string' ? file.data : '';
		let value: unknown;
		let done = false;
		if (!stored) {
			if (data.length > MAX_BASE64) throw inHost(`the file has more than ${MAX_BYTES} bytes`);
			let bytes = '';
			let plain = false;
			try {
				bytes = atob(data);
				plain = Ascii.is(bytes) && !bytes.includes('\u0000') && !bytes.includes('\u001b');
			} catch (error) {
				plain = false;
			}
			if (plain && base64) {
				value = btoa(bytes);
				done = true;
			} else if (plain && (encoding === undefined || ASCII_NAMES.includes(encoding))) {
				value = bytes;
				done = true;
			}
		}
		if (!done) {
			const args: Json = { as: base64 ? 'base64' : 'text', limit: MAX_BYTES };
			if (stored) args.id = file.id;
			else args.data = data;
			if (encoding !== undefined) args.encoding = encoding;
			// n8n shows `stripBOM` only with one of three encodings, and gives the node no
			// value of an option that it does not show. UTF-8 is the one with a form here.
			if (csv) args.stripBOM = false;
			else if (encoding === 'utf8' && typeof options.stripBOM === 'boolean') {
				args.stripBOM = options.stripBOM;
			}
			let answer: ReadAnswer;
			try {
				answer = await ctx.service<ReadAnswer>({ service: 'binaryData', op: 'read', args });
			} catch (error) {
				throw inHost('the binaryData service gave no answer');
			}
			if (typeof answer.host === 'string') throw inHost(answer.host);
			value = base64 ? answer.data : answer.text;
			if (typeof value !== 'string') throw inHost('the binaryData service gave no text');
		}

		if (csv) return csvItems(String(value), options);

		if (operation === 'fromJson') {
			if (value === '') {
				value = {};
			} else {
				try {
					value = JSON.parse(String(value));
				} catch (error) {
					const message = isJson(error) && typeof error.message === 'string' ? error.message : '';
					if (message.includes('Unexpected token')) {
						throw operationError(
							"The file selected in 'Input Binary Field' is not in JSON format",
							"Try to change the operation or select a JSON file in 'Input Binary Field'",
						);
					}
					throw operationError(message);
				}
			}
		}

		const result: Json = {};
		const files: Json = isJson(item.$binary) ? item.$binary : {};
		if (options.keepSource && options.keepSource !== 'binary') {
			for (const k of Object.keys(item)) {
				if (k !== '$binary') result[k] = item[k];
			}
		}
		result[key] = value;
		if (options.keepSource === 'binary' || options.keepSource === 'both') {
			result.$binary = files;
		} else {
			const rest: Json = {};
			for (const k of Object.keys(files)) {
				if (k !== name) rest[k] = files[k];
			}
			result.$binary = rest;
		}
		out.push(result);
		return out;
	},
});
