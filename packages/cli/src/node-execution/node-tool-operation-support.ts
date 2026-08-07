import { UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS } from '@n8n/api-types';

const UNSUPPORTED_EPHEMERAL_NODE_OPERATIONS = new Set(UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS);

export const isUnsupportedEphemeralNodeOperation = (operation: unknown): operation is string =>
	typeof operation === 'string' && UNSUPPORTED_EPHEMERAL_NODE_OPERATIONS.has(operation);

export const unsupportedEphemeralNodeOperationMessage = (operation: string): string =>
	`Operation "${operation}" requires a persistent workflow and is not supported for agent tool execution. ` +
	'Choose a non-waiting operation. For human approval, configure the intended action and set ' +
	'requireApproval: true.';
