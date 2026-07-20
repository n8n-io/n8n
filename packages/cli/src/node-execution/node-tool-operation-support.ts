import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

const UNSUPPORTED_EPHEMERAL_NODE_OPERATIONS = new Set([SEND_AND_WAIT_OPERATION, 'dispatchAndWait']);

export const isUnsupportedEphemeralNodeOperation = (operation: unknown): operation is string =>
	typeof operation === 'string' && UNSUPPORTED_EPHEMERAL_NODE_OPERATIONS.has(operation);

export const unsupportedEphemeralNodeOperationMessage = (operation: string): string =>
	`Operation "${operation}" requires a persistent workflow and is not supported for agent tool execution. ` +
	'Choose a non-waiting operation. For human approval, configure the intended action and set ' +
	'requireApproval: true.';
