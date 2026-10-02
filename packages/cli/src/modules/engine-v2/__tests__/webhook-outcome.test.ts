import type { ExecutionResponse, JsonValue } from '@n8n/engine';
import { ENCODED_BUFFER_KEY } from 'n8n-core';

import { toWebhookOutcome } from '@/modules/engine-v2/webhook-response/webhook-outcome';

const runEnd = { kind: 'runEnd' } as const;
const stepResponse = { kind: 'stepResponse' } as const;

const ended = (overrides: Record<string, unknown> = {}): ExecutionResponse => ({
	type: 'ended',
	executionId: 'exec-1',
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: {
		nodeId: 'a',
		nodeName: 'A',
		status: 'completed',
		outputs: [[{ json: { a: 1 } }]],
	},
	...overrides,
});

const response = (payload: JsonValue): ExecutionResponse => ({
	type: 'response',
	executionId: 'exec-1',
	payload,
});

describe('toWebhookOutcome', () => {
	it('reports the step the run ended with', () => {
		expect(toWebhookOutcome(ended(), runEnd)).toEqual({
			status: 'completed',
			lastNode: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
	});

	it('reports no last node when that step produced nothing', () => {
		const outcome = toWebhookOutcome(
			ended({ lastStep: { nodeId: 'c', nodeName: 'C', status: 'skipped', outputs: null } }),
			runEnd,
		);

		expect(outcome).toEqual({ status: 'completed', lastNode: undefined });
	});

	it('reports a failure with the node that caused it', () => {
		const outcome = toWebhookOutcome(
			ended({
				status: 'failed',
				lastStep: {
					nodeId: 'c',
					nodeName: 'C',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
			runEnd,
		);

		expect(outcome).toEqual({
			status: 'failed',
			nodeId: 'c',
			nodeName: 'C',
			error: { name: 'NodeOperationError', message: 'it broke' },
		});
	});

	it('reports a response failure without attributing it to a node', () => {
		const outcome = toWebhookOutcome(
			{
				type: 'undeliverable',
				executionId: 'exec-1',
				error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
			},
			runEnd,
		);

		expect(outcome).toEqual({
			status: 'undeliverable',
			error: { name: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});
	});

	it('reports the response produced by the Respond node', () => {
		const payload = { body: { ok: true }, headers: {}, statusCode: 200 };

		expect(toWebhookOutcome(response(payload), stepResponse)).toEqual({
			status: 'response',
			response: payload,
		});
	});

	it('restores a Buffer body the data plane sent as a base64 envelope', () => {
		const bytes = Buffer.from([0x00, 0xff, 0x10]);
		const headers = { 'content-type': 'application/octet-stream', 'content-length': 3 };

		const outcome = toWebhookOutcome(
			response({
				body: { [ENCODED_BUFFER_KEY]: bytes.toString('base64') },
				headers,
				statusCode: 201,
			}),
			stepResponse,
		);

		expect(outcome).toEqual({
			status: 'response',
			response: { body: bytes, headers, statusCode: 201 },
		});
		expect(Buffer.isBuffer((outcome as { response: { body: unknown } }).response.body)).toBe(true);
	});

	it.each([runEnd, { kind: 'stream' } as const, { kind: 'none' } as const])(
		'ignores a Respond node result when the expectation is %j',
		(expectation) => {
			const payload = { body: { ignored: true }, headers: {}, statusCode: 200 };

			expect(toWebhookOutcome(response(payload), expectation)).toBeUndefined();
		},
	);

	it('does not settle on a chunk', () => {
		const chunk: ExecutionResponse = {
			type: 'chunk',
			executionId: 'exec-1',
			payload: { type: 'item', content: 'hi' },
		};

		expect(toWebhookOutcome(chunk, { kind: 'stream' })).toBeUndefined();
	});
});
