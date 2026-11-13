import { Transform, type TransformCallback } from 'stream';

import { FileUploadError } from './errors/data-table-file-upload.error';

export const CSV_MAX_COLUMNS = 1000;

const COMMA = 0x2c;
const QUOTE = 0x22;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;

/**
 * Passes CSV bytes through unchanged, and fails when a record has more than `maxColumns` fields.
 * The parser builds a whole record before it can check its length, so the count runs on the raw bytes.
 */
export class CsvColumnLimit extends Transform {
	private columnCountInLine = 1;

	private insideQuotes = false;

	constructor(private readonly maxColumns: number = CSV_MAX_COLUMNS) {
		super();
	}

	_transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback): void {
		// An index loop is about four times faster than `for...of` on a Buffer.
		for (let index = 0; index < chunk.length; index++) {
			switch (chunk[index]) {
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

		done(null, chunk);
	}

	private tooManyColumnsError() {
		return new FileUploadError(
			`The file has more than ${this.maxColumns} columns. Remove columns and try again.`,
		);
	}
}
