/* eslint-disable @typescript-eslint/no-use-before-define */
import * as iconvlite from 'iconv-lite';
import * as qp from 'quoted-printable';
import * as utf8 from 'utf8';
import * as uuencode from 'uuencode';

export abstract class PartData {
	constructor(readonly buffer: Buffer) {}

	toString(charset?: string) {
		return iconvlite.decode(this.buffer, charset ?? 'utf-8');
	}

	static fromData(data: string, encoding: string, charset?: string): PartData {
		if (encoding === 'BASE64') {
			return new Base64PartData(data);
		}

		if (encoding === 'QUOTED-PRINTABLE') {
			return new QuotedPrintablePartData(data, charset);
		}

		if (encoding === '7BIT') {
			return new SevenBitPartData(data);
		}

		if (encoding === '8BIT' || encoding === 'BINARY') {
			return new BinaryPartData(data, charset);
		}

		if (encoding === 'UUENCODE') {
			return new UuencodedPartData(data);
		}

		// if it gets here, the encoding is not currently supported
		throw new Error('Unknown encoding ' + encoding);
	}
}

export class Base64PartData extends PartData {
	constructor(data: string) {
		super(Buffer.from(data, 'base64'));
	}
}

export class QuotedPrintablePartData extends PartData {
	static ansiBuffer(data: string): Buffer {
		const decoded = qp.decode(data);
		const arr = [];
		for (let index = 0; index < decoded.length; index++) {
			arr.push(decoded.charCodeAt(index));
		}
		return Buffer.from(arr);
	}

	static utf8Buffer(data: string): Buffer {
		return Buffer.from(utf8.decode(qp.decode(data)));
	}

	constructor(data: string, charset?: string) {
		const decoded =
			charset?.toUpperCase() === 'UTF-8'
				? QuotedPrintablePartData.utf8Buffer(data)
				: QuotedPrintablePartData.ansiBuffer(data);
		super(decoded);
	}
}

export class SevenBitPartData extends PartData {
	constructor(data: string) {
		super(Buffer.from(data));
	}

	toString() {
		return this.buffer.toString('ascii');
	}
}

export class BinaryPartData extends PartData {
	constructor(
		data: string,
		readonly charset: string = 'utf-8',
	) {
		super(Buffer.from(data));
	}

	toString() {
		return iconvlite.decode(this.buffer, this.charset);
	}
}

export class UuencodedPartData extends PartData {
	constructor(data: string) {
		const parts = data.split('\n'); // remove newline characters
		const merged = parts.splice(1, parts.length - 4).join(''); // remove excess lines and join lines with empty string
		const decoded = uuencode.decode(merged);
		super(decoded);
	}
}
