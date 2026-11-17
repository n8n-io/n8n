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

export default defineNode<ExtractParameters>({
	type: 'n8n-nodes-base.extractFromFile',
	version: 1,
	supports: {
		operations: {
			text: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
			xml: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
			fromJson: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
			binaryToPropery: ['binaryPropertyName', 'destinationKey', 'options', 'itemIndex'],
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
		const file = fileOf(item, name, index);
		if (!plainKey(name)) throw inHost('the name of the binary field is a path');
		if (!plainKey(key)) throw inHost('the destination key is a path');

		const base64 = operation === 'binaryToPropery';
		const encoding = options.encoding ? options.encoding : undefined;
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
			if (encoding === 'utf8' && typeof options.stripBOM === 'boolean') {
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
