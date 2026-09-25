import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionResponse } from '@n8n/engine';

import {
	deserializeExecutionResponse,
	serializeExecutionResponse,
} from '../response-channel/execution-response-frame';

const endedResponse = (): ExecutionResponse => ({
	type: 'ended',
	executionId: 'exec-1',
	workflowId: 'workflow-1',
	status: 'completed',
	lastStep: {
		nodeId: 'node-1',
		nodeName: 'Edit Fields',
		status: 'completed',
		outputs: [[{ json: { value: 1 } }]],
	},
});

describe('execution response frames', () => {
	describe('serializeExecutionResponse', () => {
		it('serializes a valid response', () => {
			const response = endedResponse();

			expect(serializeExecutionResponse(response, mockLogger())).toEqual({
				ok: true,
				frame: JSON.stringify(response),
			});
		});

		it('returns an undeliverable frame when serialization fails', () => {
			const response = endedResponse() as ExecutionResponse & { circular?: unknown };
			response.circular = response;

			const result = serializeExecutionResponse(response, mockLogger());

			expect(result).toMatchObject({
				ok: false,
				frame: JSON.stringify({
					type: 'undeliverable',
					executionId: 'exec-1',
					error: {
						code: 'RESPONSE_SERIALIZATION_FAILED',
						message: 'The execution response could not be serialized.',
					},
				}),
				error: expect.any(Error),
			});
		});

		it('returns an undeliverable frame when the response exceeds the size limit', () => {
			const result = serializeExecutionResponse(endedResponse(), mockLogger(), 1);

			expect(result).toMatchObject({
				ok: false,
				frame: JSON.stringify({
					type: 'undeliverable',
					executionId: 'exec-1',
					error: {
						code: 'RESPONSE_TOO_LARGE',
						message: 'The execution response exceeds the maximum size of 1 bytes.',
					},
				}),
				error: expect.any(Error),
			});
		});
	});

	describe('deserializeExecutionResponse', () => {
		it('deserializes a valid frame', () => {
			const response = endedResponse();

			expect(deserializeExecutionResponse(JSON.stringify(response), mockLogger())).toEqual({
				ok: true,
				result: response,
			});
		});

		it('returns an error for a malformed response', () => {
			const result = deserializeExecutionResponse(
				JSON.stringify({ type: 'unknown' }),
				mockLogger(),
			);

			expect(result).toEqual({ ok: false, error: expect.any(Error) });
		});

		it('returns an error for unreadable JSON', () => {
			const result = deserializeExecutionResponse('not JSON', mockLogger());

			expect(result).toEqual({ ok: false, error: expect.any(Error) });
		});
	});
});
