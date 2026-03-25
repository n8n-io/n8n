export default function stripFinalNewline(input) {
	if (typeof input === 'string') {
		return stripFinalNewlineString(input);
	}

	if (!(ArrayBuffer.isView(input) && input.BYTES_PER_ELEMENT === 1)) {
		throw new Error('Input must be a string or a Uint8Array');
	}

	return stripFinalNewlineBinary(input);
}

const stripFinalNewlineString = input =>
	input.at(-1) === LF
		? input.slice(0, input.at(-2) === CR ? -2 : -1)
		: input;

const stripFinalNewlineBinary = input =>
	input.at(-1) === LF_BINARY
		? input.subarray(0, input.at(-2) === CR_BINARY ? -2 : -1)
		: input;

const LF = '\n';
const LF_BINARY = LF.codePointAt(0);
const CR = '\r';
const CR_BINARY = CR.codePointAt(0);
