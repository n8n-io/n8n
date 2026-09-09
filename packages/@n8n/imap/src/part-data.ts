import * as iconvlite from 'iconv-lite';
import * as qp from 'quoted-printable';
import * as utf8 from 'utf8';

import { uuDecode } from './uudecode';

/** A body that declares UTF-8 and then sends something else still has to come through. */
const asUtf8 = (decoded: string): string => {
	try {
		return utf8.decode(decoded);
	} catch {
		return decoded;
	}
};

export abstract class PartData {
	constructor(readonly buffer: Buffer) {}

	toString() {
		return this.buffer.toString();
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
	constructor(data: string, charset?: string) {
		const decoded = qp.decode(data);
		super(Buffer.from(charset?.toUpperCase() === 'UTF-8' ? asUtf8(decoded) : decoded));
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
	readonly charset: string;

	constructor(data: string, charset = 'utf-8') {
		super(Buffer.from(data));
		// A mailer can declare a charset iconv-lite has never heard of, `unknown-8bit` among them,
		// and decoding as UTF-8 is what this part did before any charset was read at all.
		this.charset = iconvlite.encodingExists(charset) ? charset : 'utf-8';
	}

	toString() {
		return iconvlite.decode(this.buffer, this.charset);
	}
}

export class UuencodedPartData extends PartData {
	constructor(data: string) {
		const parts = data.split('\n'); // remove newline characters
		const merged = parts.splice(1, parts.length - 4).join(''); // remove excess lines and join lines with empty string
		super(uuDecode(merged));
	}
}
