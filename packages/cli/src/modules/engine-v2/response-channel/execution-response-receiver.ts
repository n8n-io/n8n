import type { ExecutionResponse } from '@n8n/engine';

export type UnsubscribeExecutionResponse = () => void;

/** Receives responses from executions and delivers them to their callers. */
export interface ExecutionResponseReceiver {
	receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): UnsubscribeExecutionResponse;
	stop(): Promise<void>;
}
