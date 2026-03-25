import {verboseLog, serializeVerboseMessage} from './log.js';
import {isFullVerbose} from './values.js';

// When `verbose` is `'full'`, print IPC messages from the subprocess
export const shouldLogIpc = verboseInfo => isFullVerbose(verboseInfo, 'ipc');

export const logIpcOutput = (message, verboseInfo) => {
	const verboseMessage = serializeVerboseMessage(message);
	verboseLog({
		type: 'ipc',
		verboseMessage,
		fdNumber: 'ipc',
		verboseInfo,
	});
};
