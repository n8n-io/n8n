import { EventEmitter } from 'events';
import type { Response } from 'express';
import type { Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { acquireIsolateForResponse } from '@/webhooks/acquire-isolate-for-response';

describe('acquireIsolateForResponse', () => {
	/**
	 * A response with real event semantics. `mock<Response>()` alone stubs `on`,
	 * so the subscription this depends on would be silently swallowed.
	 */
	const responseMock = () => {
		const emitter = new EventEmitter();
		const response = mock<Response>();
		// `Object.assign`, because the auto-mock types these as mock functions.
		Object.assign(response, {
			on: emitter.on.bind(emitter),
			once: emitter.once.bind(emitter),
			emit: emitter.emit.bind(emitter),
		});
		return response;
	};

	/** `acquireIsolate` resolves only when the returned `finishAcquire` is called. */
	const workflowMock = () => {
		const releaseIsolate = vi.fn().mockResolvedValue(undefined);
		let finishAcquire = () => {};
		const acquireIsolate = vi
			.fn()
			.mockImplementation(
				async () => await new Promise<void>((resolve) => (finishAcquire = resolve)),
			);
		const workflow = mock<Workflow>({ expression: mock({ acquireIsolate, releaseIsolate }) });
		return { workflow, acquireIsolate, releaseIsolate, finishAcquire: () => finishAcquire() };
	};

	const flush = async () => await new Promise((resolve) => setImmediate(resolve));

	it('releases when the response closes', async () => {
		const { workflow, releaseIsolate, finishAcquire } = workflowMock();
		const response = responseMock();

		const acquisition = acquireIsolateForResponse(workflow, response);
		finishAcquire();
		await acquisition;
		expect(releaseIsolate).not.toHaveBeenCalled();

		response.emit('close');
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases when the response finishes', async () => {
		const { workflow, releaseIsolate, finishAcquire } = workflowMock();
		const response = responseMock();

		const acquisition = acquireIsolateForResponse(workflow, response);
		finishAcquire();
		await acquisition;

		response.emit('finish');
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases exactly once when finish and close both fire', async () => {
		const { workflow, releaseIsolate, finishAcquire } = workflowMock();
		const response = responseMock();

		const acquisition = acquireIsolateForResponse(workflow, response);
		finishAcquire();
		await acquisition;

		// A real response emits both, so the guard has to hold.
		response.emit('finish');
		response.emit('close');
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases exactly once when the returned release is also called', async () => {
		const { workflow, releaseIsolate, finishAcquire } = workflowMock();
		const response = responseMock();

		const acquisition = acquireIsolateForResponse(workflow, response);
		finishAcquire();
		const { release } = await acquisition;

		response.emit('close');
		await release();
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('releases and reports the response as ended when the client leaves mid-acquisition', async () => {
		// `close` fires once. A listener installed after the acquisition would
		// never see it, so the isolate acquired moments later would leak.
		const { workflow, releaseIsolate, finishAcquire } = workflowMock();
		const response = responseMock();

		const acquisition = acquireIsolateForResponse(workflow, response);
		response.emit('close');
		// Nothing had been acquired when the listener ran, so it had nothing to
		// release; the acquisition itself has to notice and release.
		expect(releaseIsolate).not.toHaveBeenCalled();

		finishAcquire();
		const { responseEnded } = await acquisition;

		expect(responseEnded).toBe(true);
		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('does not release twice when the caller also releases after the client left', async () => {
		const { workflow, releaseIsolate, finishAcquire } = workflowMock();
		const response = responseMock();

		const acquisition = acquireIsolateForResponse(workflow, response);
		response.emit('close');
		finishAcquire();
		const { release } = await acquisition;

		await release();
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('does not acquire when acquisition is skipped, and still releases once', async () => {
		// Releasing without having acquired is a no-op one level down, and keeping
		// it unconditional matches the `finally` this replaced.
		const { workflow, acquireIsolate, releaseIsolate } = workflowMock();
		const response = responseMock();

		const { release, responseEnded } = await acquireIsolateForResponse(workflow, response, {
			acquire: false,
		});

		expect(acquireIsolate).not.toHaveBeenCalled();
		expect(responseEnded).toBe(false);

		response.emit('close');
		await release();
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('does not reject when releasing fails from a response handler', async () => {
		const releaseIsolate = vi.fn().mockRejectedValue(new Error('isolate already gone'));
		const workflow = mock<Workflow>({
			expression: mock({ acquireIsolate: vi.fn().mockResolvedValue(true), releaseIsolate }),
		});
		const response = responseMock();

		await acquireIsolateForResponse(workflow, response);

		// Nothing awaits the listeners, so a rejection here would surface as an
		// unhandled rejection and take the process down.
		expect(() => response.emit('close')).not.toThrow();
		await flush();

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});
});
