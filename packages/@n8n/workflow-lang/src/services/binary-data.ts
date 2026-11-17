/**
 * The `binaryData` service of `ctx.service` (spec 9.9) for the bytes of the binary data of an
 * item. The runtime answers the call `metadata` itself. n8n answers these two calls:
 *
 * - `read`: the bytes of a file as text (with the encoding rules of the v1 file nodes:
 *   `chardet` finds the encoding when the call names none, and `iconv-lite` decodes), or as
 *   base64.
 * - `store`: a new binary entry from base64 bytes, as `prepareBinaryData` of n8n-core makes it.
 *
 * A call that has no exact form here gives `{ host: <reason> }`. The library node then hands
 * the node over to the fallback host, where the v1 node runs. So the service never gives a
 * result that differs from v1.
 */
import type { ServiceAnswer, ServiceCallEvent } from './data-table.ts';

/** The largest file, in bytes, that a compiled file node reads or writes. */
export const BINARY_DATA_MAX_BYTES = 262_144;

/** The parts of n8n that the calls need. */
export interface BinaryDataBackend {
	/** The bytes of the stored file `id`. Null when the file has more than `limit` bytes. */
	read(id: string, limit: number): Promise<Uint8Array | null>;
	/** `detectBinaryEncoding` of n8n-core (`chardet.detect`). */
	detect(bytes: Uint8Array): string | null;
	/**
	 * `prepareBinaryData` of n8n-core for the execution of the call. Null when the binary
	 * data mode of the instance has no form here.
	 */
	store(
		bytes: Uint8Array,
		fileName: string | undefined,
		mimeType: string | undefined,
	): Promise<unknown>;
}

/** Encodings of iconv-lite that decode each byte below 0x80 as the same code point. */
const ASCII_COMPATIBLE = new Set([
	'utf8',
	'ascii',
	'usascii',
	'latin1',
	'iso88591',
	'iso88592',
	'iso88595',
	'iso88597',
	'iso88599',
	'iso885915',
	'windows1250',
	'windows1251',
	'windows1252',
	'windows1253',
	'windows1254',
	'windows1255',
	'windows1256',
	'cp1250',
	'cp1251',
	'cp1252',
	'koi8r',
	'shiftjis',
	'big5',
	'eucjp',
	'euckr',
	'gb18030',
]);

/** The name of an encoding as iconv-lite reads it: lower case, letters and digits only. */
function canonical(encoding: string): string {
	return encoding.toLowerCase().replace(/[^0-9a-z]/g, '');
}

function host(reason: string): ServiceAnswer {
	return { ok: true, result: { host: reason } };
}

function isAscii(bytes: Uint8Array): boolean {
	for (const byte of bytes) if (byte >= 0x80) return false;
	return true;
}

/**
 * The text of the bytes, as `iconv.decode(bytes, encoding, { stripBOM })` gives it, or null
 * when this function has no exact form for the encoding and the bytes.
 */
export function decodeText(
	bytes: Uint8Array,
	encoding: string,
	stripBOM: boolean | undefined,
): string | null {
	const name = canonical(encoding);
	if (!ASCII_COMPATIBLE.has(name)) return null;
	const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (isAscii(bytes)) return buffer.toString('latin1');
	if (name === 'latin1' || name === 'iso88591') return buffer.toString('latin1');
	if (name !== 'utf8') return null;
	const text = buffer.toString('utf8');
	// iconv-lite removes a byte order mark unless the option is `false`.
	return stripBOM !== false && text.startsWith('\uFEFF') ? text.slice(1) : text;
}

/** Runs one `binaryData` call (`read` or `store`). */
export async function runBinaryDataCall(
	backend: BinaryDataBackend,
	call: ServiceCallEvent,
): Promise<ServiceAnswer> {
	try {
		const args = call.args ?? {};
		const asked = typeof args.limit === 'number' ? args.limit : BINARY_DATA_MAX_BYTES;
		const limit = Math.min(asked, BINARY_DATA_MAX_BYTES);
		if (call.op === 'read') {
			let bytes: Uint8Array | null;
			if (typeof args.id === 'string' && args.id !== '') {
				bytes = await backend.read(args.id, limit);
			} else if (typeof args.data === 'string') {
				bytes = Buffer.from(args.data, 'base64');
			} else {
				return host('the call names no file');
			}
			if (bytes === null || bytes.byteLength > limit) {
				return host(`the file has more than ${limit} bytes`);
			}
			if (args.as === 'base64') {
				return { ok: true, result: { data: Buffer.from(bytes).toString('base64') } };
			}
			const encoding =
				typeof args.encoding === 'string' && args.encoding !== ''
					? args.encoding
					: backend.detect(bytes);
			if (typeof encoding !== 'string') return host('the encoding of the file is not known');
			const stripBOM = typeof args.stripBOM === 'boolean' ? args.stripBOM : undefined;
			const text = decodeText(bytes, encoding, stripBOM);
			if (text === null) return host(`the encoding "${encoding}" has no compiled form`);
			return { ok: true, result: { text } };
		}
		if (call.op === 'store') {
			if (typeof args.data !== 'string') return host('the call has no bytes');
			const bytes = Buffer.from(args.data, 'base64');
			if (bytes.byteLength > limit) return host(`the file has more than ${limit} bytes`);
			const entry = await backend.store(
				bytes,
				typeof args.fileName === 'string' ? args.fileName : undefined,
				typeof args.mimeType === 'string' ? args.mimeType : undefined,
			);
			if (entry === null || entry === undefined) {
				return host('the binary data mode of the instance has no compiled form');
			}
			// JSON as the wire carries it.
			const text = JSON.stringify(entry);
			return { ok: true, result: { entry: JSON.parse(text) as unknown } };
		}
		return host(`the binaryData service has no operation "${call.op}"`);
	} catch (error) {
		// The v1 node gives its own error for a file that cannot be read or stored.
		return host(error instanceof Error ? error.message : String(error));
	}
}
