import {isVerbose, VERBOSE_VALUES, isVerboseFunction} from './values.js';

// Information computed before spawning, used by the `verbose` option
export const getVerboseInfo = (verbose, escapedCommand, rawOptions) => {
	validateVerbose(verbose);
	const commandId = getCommandId(verbose);
	return {
		verbose,
		escapedCommand,
		commandId,
		rawOptions,
	};
};

const getCommandId = verbose => isVerbose({verbose}) ? COMMAND_ID++ : undefined;

// Prepending the `pid` is useful when multiple commands print their output at the same time.
// However, we cannot use the real PID since this is not available with `child_process.spawnSync()`.
// Also, we cannot use the real PID if we want to print it before `child_process.spawn()` is run.
// As a pro, it is shorter than a normal PID and never re-uses the same id.
// As a con, it cannot be used to send signals.
let COMMAND_ID = 0n;

const validateVerbose = verbose => {
	for (const fdVerbose of verbose) {
		if (fdVerbose === false) {
			throw new TypeError('The "verbose: false" option was renamed to "verbose: \'none\'".');
		}

		if (fdVerbose === true) {
			throw new TypeError('The "verbose: true" option was renamed to "verbose: \'short\'".');
		}

		if (!VERBOSE_VALUES.includes(fdVerbose) && !isVerboseFunction(fdVerbose)) {
			const allowedValues = VERBOSE_VALUES.map(allowedValue => `'${allowedValue}'`).join(', ');
			throw new TypeError(`The "verbose" option must not be ${fdVerbose}. Allowed values are: ${allowedValues} or a function.`);
		}
	}
};
