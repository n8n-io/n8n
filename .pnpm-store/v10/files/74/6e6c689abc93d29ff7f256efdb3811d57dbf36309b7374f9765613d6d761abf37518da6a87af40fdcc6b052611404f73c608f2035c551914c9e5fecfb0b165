import {isVerbose} from './values.js';
import {verboseLog} from './log.js';

// When `verbose` is `short|full|custom`, print each command
export const logCommand = (escapedCommand, verboseInfo) => {
	if (!isVerbose(verboseInfo)) {
		return;
	}

	verboseLog({
		type: 'command',
		verboseMessage: escapedCommand,
		verboseInfo,
	});
};
