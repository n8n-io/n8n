import prettyMs from 'pretty-ms';
import {isVerbose} from './values.js';
import {verboseLog} from './log.js';
import {logError} from './error.js';

// When `verbose` is `short|full|custom`, print each command's completion, duration and error
export const logResult = (result, verboseInfo) => {
	if (!isVerbose(verboseInfo)) {
		return;
	}

	logError(result, verboseInfo);
	logDuration(result, verboseInfo);
};

const logDuration = (result, verboseInfo) => {
	const verboseMessage = `(done in ${prettyMs(result.durationMs)})`;
	verboseLog({
		type: 'duration',
		verboseMessage,
		verboseInfo,
		result,
	});
};
