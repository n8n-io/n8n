import {logCommand} from '../verbose/start.js';
import {getVerboseInfo} from '../verbose/info.js';
import {getStartTime} from '../return/duration.js';
import {joinCommand} from './escape.js';
import {normalizeFdSpecificOption} from './specific.js';

// Compute `result.command`, `result.escapedCommand` and `verbose`-related information
export const handleCommand = (filePath, rawArguments, rawOptions) => {
	const startTime = getStartTime();
	const {command, escapedCommand} = joinCommand(filePath, rawArguments);
	const verbose = normalizeFdSpecificOption(rawOptions, 'verbose');
	const verboseInfo = getVerboseInfo(verbose, escapedCommand, {...rawOptions});
	logCommand(escapedCommand, verboseInfo);
	return {
		command,
		escapedCommand,
		startTime,
		verboseInfo,
	};
};
