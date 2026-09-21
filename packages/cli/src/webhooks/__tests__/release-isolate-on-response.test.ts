import { EventEmitter } from 'events';
import type { Response } from 'express';
import type { Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { releaseIsolateOnResponse } from '@/webhooks/release-isolate-on-response';

describe('releaseIsolateOnResponse', () => {
	/**
	 * A response with real event semantics. `mock<Response>()` alone stubs `on`,
	 * so a subscription would be silently swallowed, and stubs `writableEnded` /
	 * `destroyed` as truthy objects, which would read as "already over".
	 */
	const responseMock = ({ ended = false, destroyed = false } = {}) => {
		const emitter = new EventEmitter();
		const response = mock<Response>();
		response.on = emitter.on.bind(emitter) as unknown as Response['on'];
		response.emit = emitter.emit.bind(emitter) as unknown as Response['emit'];
		Object.defineProperty(response, 'writableEnded', { value: ended, configurable: true });
		Object.defineProperty(response, 'destroyed', { value: destroyed, configurable: true });
		return response;
	};

	const workflowMock = () => {
		const releaseIsolate = vi.fn().mockResolvedValue(undefined);
		const workflow = mock<Workflow>({ expression: mock({ releaseIsolate }) });
		return { workflow, releaseIsolate };
	};

	const flush = async () => await new Promise((resolve) => setImmediate(resolve));

	it('releases when the response closes', async () => {
		const { workflow, releaseIsolate } = workflowMock();
		const response = responseMock();

		releaseIsolateOnResponse(workflow, response);
		expect(releaseIsolate).not.toHaveBeenCalled();

		response.emit('close');
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases when the response finishes', async () => {
		const { workflow, releaseIsolate } = workflowMock();
		const response = responseMock();

		releaseIsolateOnResponse(workflow, response);
		response.emit('finish');
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases exactly once when finish and close both fire', async () => {
		const { workflow, releaseIsolate } = workflowMock();
		const response = responseMock();

		releaseIsolateOnResponse(workflow, response);
		// A real response emits both, so the guard has to hold.
		response.emit('finish');
		response.emit('close');
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases exactly once when the returned release is also called', async () => {
		const { workflow, releaseIsolate } = workflowMock();
		const response = responseMock();

		const release = releaseIsolateOnResponse(workflow, response);
		response.emit('close');
		await release();
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases immediately when the response already ended before subscribing', async () => {
		// The caller awaits before it can subscribe, so a client that disconnects
		// during those awaits has already emitted 'close' — the listeners would
		// never fire and the isolate would leak.
		const { workflow, releaseIsolate } = workflowMock();

		releaseIsolateOnResponse(workflow, responseMock({ ended: true }));
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases immediately when the response was already destroyed', async () => {
		const { workflow, releaseIsolate } = workflowMock();

		releaseIsolateOnResponse(workflow, responseMock({ destroyed: true }));
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('does not reject when releasing fails from a response handler', async () => {
		const releaseIsolate = vi.fn().mockRejectedValue(new Error('isolate already gone'));
		const workflow = mock<Workflow>({ expression: mock({ releaseIsolate }) });
		const response = responseMock();

		releaseIsolateOnResponse(workflow, response);
		// Nothing awaits the listeners, so a rejection here would surface as an
		// unhandled rejection and take the process down.
		expect(() => response.emit('close')).not.toThrow();
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});
});
