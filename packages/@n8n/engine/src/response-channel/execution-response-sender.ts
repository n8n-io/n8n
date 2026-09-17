import {
	noopResponseEmitter,
	type ExecutionResponse,
	type ResponseEmitter,
} from './execution-response.types';

/** Sends responses from an execution back to its caller. */
export interface ExecutionResponseSender {
	send(response: ExecutionResponse): void;
	emitterFor(executionId: string): ResponseEmitter;
	stop(): Promise<void>;
}

/** Response sender for a host that discards execution responses. */
export const noopExecutionResponseSender: ExecutionResponseSender = Object.freeze({
	send: () => {},
	emitterFor: (_executionId: string) => noopResponseEmitter,
	stop: async () => {},
});
