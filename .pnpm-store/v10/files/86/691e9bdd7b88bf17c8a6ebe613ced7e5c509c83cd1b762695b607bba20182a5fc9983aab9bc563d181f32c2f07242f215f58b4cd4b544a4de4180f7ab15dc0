// Validate `encoding` option
export const validateEncoding = ({encoding}) => {
	if (ENCODINGS.has(encoding)) {
		return;
	}

	const correctEncoding = getCorrectEncoding(encoding);
	if (correctEncoding !== undefined) {
		throw new TypeError(`Invalid option \`encoding: ${serializeEncoding(encoding)}\`.
Please rename it to ${serializeEncoding(correctEncoding)}.`);
	}

	const correctEncodings = [...ENCODINGS].map(correctEncoding => serializeEncoding(correctEncoding)).join(', ');
	throw new TypeError(`Invalid option \`encoding: ${serializeEncoding(encoding)}\`.
Please rename it to one of: ${correctEncodings}.`);
};

const TEXT_ENCODINGS = new Set(['utf8', 'utf16le']);
export const BINARY_ENCODINGS = new Set(['buffer', 'hex', 'base64', 'base64url', 'latin1', 'ascii']);
const ENCODINGS = new Set([...TEXT_ENCODINGS, ...BINARY_ENCODINGS]);

const getCorrectEncoding = encoding => {
	if (encoding === null) {
		return 'buffer';
	}

	if (typeof encoding !== 'string') {
		return;
	}

	const lowerEncoding = encoding.toLowerCase();
	if (lowerEncoding in ENCODING_ALIASES) {
		return ENCODING_ALIASES[lowerEncoding];
	}

	if (ENCODINGS.has(lowerEncoding)) {
		return lowerEncoding;
	}
};

const ENCODING_ALIASES = {
	// eslint-disable-next-line unicorn/text-encoding-identifier-case
	'utf-8': 'utf8',
	'utf-16le': 'utf16le',
	'ucs-2': 'utf16le',
	ucs2: 'utf16le',
	binary: 'latin1',
};

const serializeEncoding = encoding => typeof encoding === 'string' ? `"${encoding}"` : String(encoding);
