import { Transform, type TransformCallback } from 'stream';
import { StringDecoder } from 'string_decoder';

import { FileUploadError } from './errors/data-table-file-upload.error';

export const CSV_MAX_COLUMNS = 1000;

const COMMA = 0x2c;
const QUOTE = 0x22;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;

const UTF16LE_BOM = Buffer.from([0xff, 0xfe]);

/**
 * The parser reads a file as UTF-16LE when it starts with this byte order mark, and as UTF-8 otherwise.
 */
function createDecoder(head: Buffer) {
	return new StringDecoder(
		head.subarray(0, UTF16LE_BOM.length).equals(UTF16LE_BOM) ? 'utf16le' : 'utf8',
	);
}

/**
 * Passes CSV text through as UTF-8, and fails when a record has more than `maxColumns` fields.
 * The parser builds a whole record before it can check its length, so the count runs on the stream.
 * The count runs on decoded text, so that it reads the same characters as the parser.
 */
export class CsvColumnLimit extends Transform {
	private columnCountInLine = 1;

	private insideQuotes = false;

	private decoder: StringDecoder | undefined;

	private head: Buffer = Buffer.alloc(0);

	constructor(private readonly maxColumns: number = CSV_MAX_COLUMNS) {
		super();
	}

	_transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback): void {
		const bytes = this.decoder ? chunk : Buffer.concat([this.head, chunk]);

		if (!this.decoder) {
			if (bytes.length < UTF16LE_BOM.length) {
				this.head = bytes;
				done();
				return;
			}

			this.decoder = createDecoder(bytes);
			this.head = Buffer.alloc(0);
		}

		this.passText(this.decoder.write(bytes), done);
	}

	_flush(done: TransformCallback): void {
		this.decoder ??= createDecoder(this.head);
		this.passText(this.decoder.end(this.head), done);
	}

	private passText(text: string, done: TransformCallback) {
		for (let index = 0; index < text.length; index++) {
			switch (text.charCodeAt(index)) {
				case QUOTE:
					this.insideQuotes = !this.insideQuotes;
					break;
				case COMMA:
					if (!this.insideQuotes && ++this.columnCountInLine > this.maxColumns) {
						done(this.tooManyColumnsError());
						return;
					}
					break;
				case LINE_FEED:
				case CARRIAGE_RETURN:
					if (!this.insideQuotes) {
						this.columnCountInLine = 1;
					}
					break;
			}
		}

		// The UTF-16LE mark at the start becomes the UTF-8 mark. The parser removes it, because of `bom: true`.
		done(null, Buffer.from(text, 'utf8'));
	}

	private tooManyColumnsError() {
		return new FileUploadError(
			`The file has more than ${this.maxColumns} columns. Remove columns and try again.`,
		);
	}
}
