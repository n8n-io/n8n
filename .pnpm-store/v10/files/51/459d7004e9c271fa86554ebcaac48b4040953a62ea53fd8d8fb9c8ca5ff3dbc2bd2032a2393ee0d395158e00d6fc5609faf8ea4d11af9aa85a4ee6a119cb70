import {BINARY_ENCODINGS} from '../arguments/encoding-option.js';
import {TRANSFORM_TYPES} from '../stdio/type.js';
import {verboseLog, serializeVerboseMessage} from './log.js';
import {isFullVerbose} from './values.js';

// `ignore` opts-out of `verbose` for a specific stream.
// `ipc` cannot use piping.
// `inherit` would result in double printing.
// They can also lead to double printing when passing file descriptor integers or `process.std*`.
// This only leaves with `pipe` and `overlapped`.
export const shouldLogOutput = ({stdioItems, encoding, verboseInfo, fdNumber}) => fdNumber !== 'all'
	&& isFullVerbose(verboseInfo, fdNumber)
	&& !BINARY_ENCODINGS.has(encoding)
	&& fdUsesVerbose(fdNumber)
	&& (stdioItems.some(({type, value}) => type === 'native' && PIPED_STDIO_VALUES.has(value))
	|| stdioItems.every(({type}) => TRANSFORM_TYPES.has(type)));

// Printing input streams would be confusing.
// Files and streams can produce big outputs, which we don't want to print.
// We could print `stdio[3+]` but it often is redirected to files and streams, with the same issue.
// So we only print stdout and stderr.
const fdUsesVerbose = fdNumber => fdNumber === 1 || fdNumber === 2;

const PIPED_STDIO_VALUES = new Set(['pipe', 'overlapped']);

// `verbose: 'full'` printing logic with async methods
export const logLines = async (linesIterable, stream, fdNumber, verboseInfo) => {
	for await (const line of linesIterable) {
		if (!isPipingStream(stream)) {
			logLine(line, fdNumber, verboseInfo);
		}
	}
};

// `verbose: 'full'` printing logic with sync methods
export const logLinesSync = (linesArray, fdNumber, verboseInfo) => {
	for (const line of linesArray) {
		logLine(line, fdNumber, verboseInfo);
	}
};

// When `subprocess.stdout|stderr.pipe()` is called, `verbose` becomes a noop.
// This prevents the following problems:
//  - `.pipe()` achieves the same result as using `stdout: 'inherit'`, `stdout: stream`, etc. which also make `verbose` a noop.
//    For example, `subprocess.stdout.pipe(process.stdin)` would print each line twice.
//  - When chaining subprocesses with `subprocess.pipe(otherSubprocess)`, only the last one should print its output.
// Detecting whether `.pipe()` is impossible without monkey-patching it, so we use the following undocumented property.
// This is not a critical behavior since changes of the following property would only make `verbose` more verbose.
const isPipingStream = stream => stream._readableState.pipes.length > 0;

// When `verbose` is `full`, print stdout|stderr
const logLine = (line, fdNumber, verboseInfo) => {
	const verboseMessage = serializeVerboseMessage(line);
	verboseLog({
		type: 'output',
		verboseMessage,
		fdNumber,
		verboseInfo,
	});
};
