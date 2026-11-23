import type { ExecutionResponse, UnsubscribeFromExecutionChannel } from '@n8n/engine';

export type UnsubscribeExecutionResponse = UnsubscribeFromExecutionChannel;

/** Receives responses from executions and delivers them to their callers. */
export interface ExecutionResponseReceiver {
	receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): Promise<UnsubscribeExecutionResponse>;
	stop(): Promise<void>;
}
