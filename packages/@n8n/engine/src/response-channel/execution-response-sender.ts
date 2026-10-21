import { createResultOk, type Result } from '@n8n/utils/result';

import type { ExecutionResponse } from './execution-response.types';

/** Sends responses from an execution back to its caller. */
export interface ExecutionResponseSender {
	send(response: ExecutionResponse): Result<void, Error>;
	stop(): Promise<void>;
}

/** Response sender for a host that discards execution responses. */
export const noopExecutionResponseSender: ExecutionResponseSender = Object.freeze({
	send: () => createResultOk(undefined),
	stop: async () => {},
});
