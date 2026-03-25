import {inspect} from 'node:util';
import {escapeLines} from '../arguments/escape.js';
import {defaultVerboseFunction} from './default.js';
import {applyVerboseOnLines} from './custom.js';

// This prints on stderr.
// If the subprocess prints on stdout and is using `stdout: 'inherit'`,
// there is a chance both writes will compete (introducing a race condition).
// This means their respective order is not deterministic.
// In particular, this means the verbose command lines might be after the start of the subprocess output.
// Using synchronous I/O does not solve this problem.
// However, this only seems to happen when the stdout/stderr target
// (e.g. a terminal) is being written to by many subprocesses at once, which is unlikely in real scenarios.
export const verboseLog = ({type, verboseMessage, fdNumber, verboseInfo, result}) => {
	const verboseObject = getVerboseObject({type, result, verboseInfo});
	const printedLines = getPrintedLines(verboseMessage, verboseObject);
	const finalLines = applyVerboseOnLines(printedLines, verboseInfo, fdNumber);
	if (finalLines !== '') {
		console.warn(finalLines.slice(0, -1));
	}
};

const getVerboseObject = ({
	type,
	result,
	verboseInfo: {escapedCommand, commandId, rawOptions: {piped = false, ...options}},
}) => ({
	type,
	escapedCommand,
	commandId: `${commandId}`,
	timestamp: new Date(),
	piped,
	result,
	options,
});

const getPrintedLines = (verboseMessage, verboseObject) => verboseMessage
	.split('\n')
	.map(message => getPrintedLine({...verboseObject, message}));

const getPrintedLine = verboseObject => {
	const verboseLine = defaultVerboseFunction(verboseObject);
	return {verboseLine, verboseObject};
};

// Serialize any type to a line string, for logging
export const serializeVerboseMessage = message => {
	const messageString = typeof message === 'string' ? message : inspect(message);
	const escapedMessage = escapeLines(messageString);
	return escapedMessage.replaceAll('\t', ' '.repeat(TAB_SIZE));
};

// Same as `util.inspect()`
const TAB_SIZE = 2;
