// Split chunks line-wise for generators passed to the `std*` options
export const getSplitLinesGenerator = (binary, preserveNewlines, skipped, state) => binary || skipped
	? undefined
	: initializeSplitLines(preserveNewlines, state);

// Same but for synchronous methods
export const splitLinesSync = (chunk, preserveNewlines, objectMode) => objectMode
	? chunk.flatMap(item => splitLinesItemSync(item, preserveNewlines))
	: splitLinesItemSync(chunk, preserveNewlines);

const splitLinesItemSync = (chunk, preserveNewlines) => {
	const {transform, final} = initializeSplitLines(preserveNewlines, {});
	return [...transform(chunk), ...final()];
};

const initializeSplitLines = (preserveNewlines, state) => {
	state.previousChunks = '';
	return {
		transform: splitGenerator.bind(undefined, state, preserveNewlines),
		final: linesFinal.bind(undefined, state),
	};
};

// This imperative logic is much faster than using `String.split()` and uses very low memory.
const splitGenerator = function * (state, preserveNewlines, chunk) {
	if (typeof chunk !== 'string') {
		yield chunk;
		return;
	}

	let {previousChunks} = state;
	let start = -1;

	for (let end = 0; end < chunk.length; end += 1) {
		if (chunk[end] === '\n') {
			const newlineLength = getNewlineLength(chunk, end, preserveNewlines, state);
			let line = chunk.slice(start + 1, end + 1 - newlineLength);

			if (previousChunks.length > 0) {
				line = concatString(previousChunks, line);
				previousChunks = '';
			}

			yield line;
			start = end;
		}
	}

	if (start !== chunk.length - 1) {
		previousChunks = concatString(previousChunks, chunk.slice(start + 1));
	}

	state.previousChunks = previousChunks;
};

const getNewlineLength = (chunk, end, preserveNewlines, state) => {
	if (preserveNewlines) {
		return 0;
	}

	state.isWindowsNewline = end !== 0 && chunk[end - 1] === '\r';
	return state.isWindowsNewline ? 2 : 1;
};

const linesFinal = function * ({previousChunks}) {
	if (previousChunks.length > 0) {
		yield previousChunks;
	}
};

// Unless `preserveNewlines: true` is used, we strip the newline of each line.
// This re-adds them after the user `transform` code has run.
export const getAppendNewlineGenerator = ({binary, preserveNewlines, readableObjectMode, state}) => binary || preserveNewlines || readableObjectMode
	? undefined
	: {transform: appendNewlineGenerator.bind(undefined, state)};

const appendNewlineGenerator = function * ({isWindowsNewline = false}, chunk) {
	const {unixNewline, windowsNewline, LF, concatBytes} = typeof chunk === 'string' ? linesStringInfo : linesUint8ArrayInfo;

	if (chunk.at(-1) === LF) {
		yield chunk;
		return;
	}

	const newline = isWindowsNewline ? windowsNewline : unixNewline;
	yield concatBytes(chunk, newline);
};

const concatString = (firstChunk, secondChunk) => `${firstChunk}${secondChunk}`;

const linesStringInfo = {
	windowsNewline: '\r\n',
	unixNewline: '\n',
	LF: '\n',
	concatBytes: concatString,
};

const concatUint8Array = (firstChunk, secondChunk) => {
	const chunk = new Uint8Array(firstChunk.length + secondChunk.length);
	chunk.set(firstChunk, 0);
	chunk.set(secondChunk, firstChunk.length);
	return chunk;
};

const linesUint8ArrayInfo = {
	windowsNewline: new Uint8Array([0x0D, 0x0A]),
	unixNewline: new Uint8Array([0x0A]),
	LF: 0x0A,
	concatBytes: concatUint8Array,
};
