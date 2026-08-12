import type { OperatorLogBatch } from '../operator-console';

/**
 * A batch of log lines for an open operator console. Always batched — one push
 * message per line would flood the socket shared with the rest of the editor UI.
 */
export type OperatorLogsMessage = {
	type: 'operatorLogs';
	data: OperatorLogBatch;
};

export type OperatorConsolePushMessage = OperatorLogsMessage;
