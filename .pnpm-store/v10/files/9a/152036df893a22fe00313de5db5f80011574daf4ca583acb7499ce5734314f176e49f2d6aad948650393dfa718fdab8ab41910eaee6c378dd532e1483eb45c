import {constants} from 'node:os';
import {signalsByName} from 'human-signals';

// Normalize signals for comparison purpose.
// Also validate the signal exists.
export const normalizeKillSignal = killSignal => {
	const optionName = 'option `killSignal`';
	if (killSignal === 0) {
		throw new TypeError(`Invalid ${optionName}: 0 cannot be used.`);
	}

	return normalizeSignal(killSignal, optionName);
};

export const normalizeSignalArgument = signal => signal === 0
	? signal
	: normalizeSignal(signal, '`subprocess.kill()`\'s argument');

const normalizeSignal = (signalNameOrInteger, optionName) => {
	if (Number.isInteger(signalNameOrInteger)) {
		return normalizeSignalInteger(signalNameOrInteger, optionName);
	}

	if (typeof signalNameOrInteger === 'string') {
		return normalizeSignalName(signalNameOrInteger, optionName);
	}

	throw new TypeError(`Invalid ${optionName} ${String(signalNameOrInteger)}: it must be a string or an integer.\n${getAvailableSignals()}`);
};

const normalizeSignalInteger = (signalInteger, optionName) => {
	if (signalsIntegerToName.has(signalInteger)) {
		return signalsIntegerToName.get(signalInteger);
	}

	throw new TypeError(`Invalid ${optionName} ${signalInteger}: this signal integer does not exist.\n${getAvailableSignals()}`);
};

const getSignalsIntegerToName = () => new Map(Object.entries(constants.signals)
	.reverse()
	.map(([signalName, signalInteger]) => [signalInteger, signalName]));

const signalsIntegerToName = getSignalsIntegerToName();

const normalizeSignalName = (signalName, optionName) => {
	if (signalName in constants.signals) {
		return signalName;
	}

	if (signalName.toUpperCase() in constants.signals) {
		throw new TypeError(`Invalid ${optionName} '${signalName}': please rename it to '${signalName.toUpperCase()}'.`);
	}

	throw new TypeError(`Invalid ${optionName} '${signalName}': this signal name does not exist.\n${getAvailableSignals()}`);
};

const getAvailableSignals = () => `Available signal names: ${getAvailableSignalNames()}.
Available signal numbers: ${getAvailableSignalIntegers()}.`;

const getAvailableSignalNames = () => Object.keys(constants.signals)
	.sort()
	.map(signalName => `'${signalName}'`)
	.join(', ');

const getAvailableSignalIntegers = () => [...new Set(Object.values(constants.signals)
	.sort((signalInteger, signalIntegerTwo) => signalInteger - signalIntegerTwo))]
	.join(', ');

// Human-friendly description of a signal
export const getSignalDescription = signal => signalsByName[signal].description;
