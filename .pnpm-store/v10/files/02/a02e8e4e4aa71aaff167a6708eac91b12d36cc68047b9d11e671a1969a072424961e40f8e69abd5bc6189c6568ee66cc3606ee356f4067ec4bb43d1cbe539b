import {verboseLog} from './log.js';

// When `verbose` is `short|full|custom`, print each command's error when it fails
export const logError = (result, verboseInfo) => {
	if (result.failed) {
		verboseLog({
			type: 'error',
			verboseMessage: result.shortMessage,
			verboseInfo,
			result,
		});
	}
};
