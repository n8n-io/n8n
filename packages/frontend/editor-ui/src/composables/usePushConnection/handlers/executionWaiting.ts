import type { ExecutionWaiting } from '@n8n/api-types/push/execution';

/**
 * Handles the 'executionWaiting' event, which happens when a workflow execution state becomes 'waiting'.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
export async function executionWaiting(_receivedData: ExecutionWaiting) {}
