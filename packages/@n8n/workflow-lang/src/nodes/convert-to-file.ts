/**
 * Compiled library node: a hand port of `n8n-nodes-base.convertToFile` (versions 1 to 1.2)
 * for the operations that need no file format library: `toText`, `toBinary`, and `toJson`
 * with one file for each item. `createBinaryFromJson` of `nodes-base/utils/binary.ts` gives
 * the bytes; the `store` call of the `binaryData` service of n8n makes the binary entry with
 * `prepareBinaryData` of n8n-core, so the metadata and the place of the bytes are those of v1
 * in each binary data mode.
 *
 * What has no exact form ends with the mark `RUNS_IN_HOST`: the workflow then runs the v1
 * node in the fallback host, in the same run. That is: more than 262,144 bytes, an encoding
 * other than UTF-8, a source property that lodash reads as a path, a data URI, bytes as an
 * array or a Buffer object, and text that is not well-formed UTF-16.
 */
import { defineNode, operationError, type Item } from '@n8n/workflow-lang';

interface ConvertOptions {
	addBOM?: boolean;
	dataIsBase64?: boolean;
	encoding?: string;
	fileName?: string;
	mimeType?: string;
	format?: boolean;
}

interface ConvertParameters {
	operation?: string;
	mode?: string;
	sourceProperty?: string;
	binaryPropertyName?: string;
	options?: ConvertOptions;
	/** The version of the node: `toBinary` reads `dataIsBase64` in version 1 only. */
	nodeVersion?: number;
}

interface StoreAnswer {
	entry?: Record<string, unknown>;
	host?: string;
}

type Json = Record<string, unknown>;

/** `RUNS_IN_HOST` of the converter: the workflow runs the host form of the node in the same run. */
const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';

/** `BINARY_DATA_MAX_BYTES` of the `binaryData` service. */
const MAX_BYTES = 262144;
/** The base64 text of `MAX_BYTES` bytes. */
const MAX_BASE64 = 349528;

const UTF8_NAMES = ['utf8', 'utf-8', 'UTF-8', 'UTF8'];
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/_-';
/** The ASCII characters of `\s`. A text with other characters goes to the host. */
const SPACES = ' \t\n\r\u000b\u000c';

function inHost(reason: string): Error {
	return new Error(`Convert To File: ${reason}. ${RUNS_IN_HOST}`);
}

function plainKey(key: string): boolean {
	return !key.includes('.') && !key.includes('[') && !key.includes(']');
}

/** The base64 text without white space when it passes the strict check of v1, else null. */
function strictBase64(encoded: string): string | null {
	let text = '';
	for (let i = 0; i < encoded.length; i++) {
		const c = encoded.charAt(i);
		if (!SPACES.includes(c)) text += c;
	}
	let body = text.length;
	while (body > 0 && text.charAt(body - 1) === '=') body--;
	const padding = text.length - body;
	if (padding > 2) return null;
	for (let i = 0; i < body; i++) {
		if (!BASE64_CHARS.includes(text.charAt(i))) return null;
	}
	if (body % 4 === 1) return null;
	if (padding > 0 && (text.length % 4 !== 0 || body % 4 === 0)) return null;
	return text;
}

export default defineNode<ConvertParameters>({
	type: 'n8n-nodes-base.convertToFile',
	version: 1,
	supports: {
		operations: {
			toText: ['sourceProperty', 'binaryPropertyName', 'options', 'nodeVersion'],
			toBinary: ['sourceProperty', 'binaryPropertyName', 'options', 'nodeVersion'],
			toJson: ['mode="each"', 'binaryPropertyName', 'options', 'nodeVersion'],
		},
	},
	async run(ctx, parameters, items) {
		const out: Item[] = [];
		const list = items ?? [];
		if (list.length === 0) return out;
		const json: Json = {};
		for (const k of Object.keys(list[0])) {
			if (k !== '$binary') json[k] = list[0][k];
		}
		const operation = parameters.operation ?? '';
		const options = parameters.options ?? {};
		const version = parameters.nodeVersion ?? 1;
		const field = parameters.binaryPropertyName ?? 'data';
		const sourceKey = operation === 'toJson' ? '' : (parameters.sourceProperty ?? '');
		if (!plainKey(sourceKey)) throw inHost('the source property is a path');

		let fileName = options.fileName;
		let mimeType: string | undefined = options.mimeType;
		let dataIsBase64 = false;
		let strict = false;
		if (operation === 'toText') {
			fileName = options.fileName ? options.fileName : 'file.txt';
			mimeType = 'text/plain';
		} else if (operation === 'toJson') {
			mimeType = 'application/json';
		} else {
			dataIsBase64 = version === 1 ? options.dataIsBase64 !== false : true;
			strict = version >= 1.2;
		}

		const value: unknown = sourceKey ? json[sourceKey] : json;
		if (value === undefined) throw operationError(`The value in "${sourceKey}" is not set`);

		let data = '';
		if (!dataIsBase64) {
			let text = '';
			if (typeof value === 'object') {
				mimeType = 'application/json';
				text = options.format ? JSON.stringify(value, null, 2) : JSON.stringify(value);
			} else if (typeof value === 'string') {
				text = value;
			} else if (typeof value === 'number' || typeof value === 'boolean') {
				// iconv-lite encodes `'' + (value || '')`.
				text = value ? String(value) : '';
			}
			if (options.encoding && !UTF8_NAMES.includes(options.encoding)) {
				throw inHost(`the encoding "${options.encoding}" has no compiled form`);
			}
			if (text.length > MAX_BYTES) throw inHost(`the file has more than ${MAX_BYTES} bytes`);
			try {
				data = Base64.encodeUtf8(options.addBOM ? `\uFEFF${text}` : text);
			} catch (error) {
				throw inHost('the text is not well-formed');
			}
		} else {
			if (typeof value === 'object' && value !== null) {
				throw inHost('the bytes are an array or a Buffer object');
			}
			if (typeof value !== 'string') {
				throw operationError(
					`The value in "${sourceKey}" is not valid Base64 data`,
					'Use Convert to Text File to write plain text to a file.',
				);
			}
			if (!Ascii.is(value)) throw inHost('the base64 text has characters outside ASCII');
			data = value.trim();
			if (data.slice(0, 5).toLowerCase() === 'data:') throw inHost('the value is a data URI');
			if (strict) {
				const checked = strictBase64(data);
				if (checked === null) {
					throw operationError(
						`The value in "${sourceKey}" is not valid Base64 data`,
						'Use Convert to Text File to write plain text to a file.',
					);
				}
				data = checked;
			}
		}
		if (data.length > MAX_BASE64) throw inHost(`the file has more than ${MAX_BYTES} bytes`);

		const args: Json = { data, limit: MAX_BYTES };
		if (fileName) args.fileName = fileName;
		if (mimeType) args.mimeType = mimeType;
		let answer: StoreAnswer;
		try {
			answer = await ctx.service<StoreAnswer>({ service: 'binaryData', op: 'store', args });
		} catch (error) {
			throw inHost('the binaryData service gave no answer');
		}
		if (typeof answer.host === 'string') throw inHost(answer.host);
		const entry = answer.entry;
		if (entry === undefined) throw inHost('the binaryData service gave no entry');
		if (!entry.fileName) {
			const extension = entry.fileExtension;
			entry.fileName = typeof extension === 'string' && extension ? `file.${extension}` : 'file';
		}
		const files: Json = {};
		files[field] = entry;
		out.push({ $binary: files });
		return out;
	},
});
