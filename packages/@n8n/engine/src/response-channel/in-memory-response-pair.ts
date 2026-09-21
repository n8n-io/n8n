import { EventEmitter } from 'node:events';

import type { ResponseFrameReceiver, ResponseFrameSender } from './response-frame';

/**
 * Creates separate in-process frame endpoints for a deployment where both
 * planes share a process.
 *
 * One emitter event per execution gives each run its own address.
 *
 * It carries frames rather than objects, exactly as a networked implementation
 * does. This keeps integrated and split deployments on the same wire format.
 */
export function createInMemoryResponsePair(): {
	frameSender: ResponseFrameSender;
	frameReceiver: ResponseFrameReceiver;
} {
	const executions = new EventEmitter();
	let senderStopped = false;
	let receiverStopped = false;

	return {
		frameSender: {
			send: (executionId, frame) => {
				if (!senderStopped) executions.emit(executionId, frame);
			},
			stop: async () => {
				senderStopped = true;
			},
		},
		frameReceiver: {
			receive: (executionId, handler) => {
				if (receiverStopped) return () => {};

				executions.on(executionId, handler);
				return () => executions.off(executionId, handler);
			},
			stop: async () => {
				receiverStopped = true;
				executions.removeAllListeners();
			},
		},
	};
}
