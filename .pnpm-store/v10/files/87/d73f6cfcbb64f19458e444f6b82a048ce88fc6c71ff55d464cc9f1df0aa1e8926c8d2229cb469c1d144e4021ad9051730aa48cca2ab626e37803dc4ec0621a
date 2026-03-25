import {getFdSpecificValue} from '../arguments/specific.js';

// The `verbose` option can have different values for `stdout`/`stderr`
export const isVerbose = ({verbose}, fdNumber) => getFdVerbose(verbose, fdNumber) !== 'none';

// Whether IPC and output and logged
export const isFullVerbose = ({verbose}, fdNumber) => !['none', 'short'].includes(getFdVerbose(verbose, fdNumber));

// The `verbose` option can be a function to customize logging
export const getVerboseFunction = ({verbose}, fdNumber) => {
	const fdVerbose = getFdVerbose(verbose, fdNumber);
	return isVerboseFunction(fdVerbose) ? fdVerbose : undefined;
};

// When using `verbose: {stdout, stderr, fd3, ipc}`:
//  - `verbose.stdout|stderr|fd3` is used for 'output'
//  - `verbose.ipc` is only used for 'ipc'
//  - highest `verbose.*` value is used for 'command', 'error' and 'duration'
const getFdVerbose = (verbose, fdNumber) => fdNumber === undefined
	? getFdGenericVerbose(verbose)
	: getFdSpecificValue(verbose, fdNumber);

// When using `verbose: {stdout, stderr, fd3, ipc}` and logging is not specific to a file descriptor.
// We then use the highest `verbose.*` value, using the following order:
//  - function > 'full' > 'short' > 'none'
//  - if several functions are defined: stdout > stderr > fd3 > ipc
const getFdGenericVerbose = verbose => verbose.find(fdVerbose => isVerboseFunction(fdVerbose))
	?? VERBOSE_VALUES.findLast(fdVerbose => verbose.includes(fdVerbose));

// Whether the `verbose` option is customized using a function
export const isVerboseFunction = fdVerbose => typeof fdVerbose === 'function';

export const VERBOSE_VALUES = ['none', 'short', 'full'];
