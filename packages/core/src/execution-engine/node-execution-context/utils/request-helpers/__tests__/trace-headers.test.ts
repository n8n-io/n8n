import type { INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { addTraceHeaders, getTraceHeaders } from '../trace-headers';

const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

type Inject = (executionId: string, nodeName: string | undefined, headers: object) => void;

const writesTraceparent = () =>
	vi.fn<Inject>((_executionId, _nodeName, headers) => {
		Object.assign(headers, { traceparent: TRACEPARENT });
	});

const additionalDataWith = (options: {
	executionId?: string;
	inject?: Inject;
}): IWorkflowExecuteAdditionalData =>
	mock<IWorkflowExecuteAdditionalData>({
		executionId: options.executionId,
		otel: options.inject
			? { injectTraceHeaders: options.inject, extractInboundBaggage: vi.fn() }
			: undefined,
	});

describe('trace-headers', () => {
	const node = mock<INode>({ name: 'HTTP Request' });

	describe('getTraceHeaders', () => {
		test('returns the headers injected for the execution and node name', () => {
			const inject = writesTraceparent();

			const result = getTraceHeaders(additionalDataWith({ executionId: 'exec-1', inject }), node);

			expect(result).toEqual({ traceparent: TRACEPARENT });
			expect(inject).toHaveBeenCalledWith('exec-1', 'HTTP Request', expect.any(Object));
		});

		test('returns an empty object when otel is not configured', () => {
			expect(getTraceHeaders(additionalDataWith({ executionId: 'exec-1' }), node)).toEqual({});
		});

		test('returns an empty object and does not inject when there is no execution id', () => {
			const inject = writesTraceparent();

			const result = getTraceHeaders(additionalDataWith({ inject }), node);

			expect(result).toEqual({});
			expect(inject).not.toHaveBeenCalled();
		});
	});

	describe('addTraceHeaders', () => {
		const data = () => additionalDataWith({ executionId: 'exec-1', inject: writesTraceparent() });

		test('keeps the existing headers next to the trace headers', () => {
			const target: { headers?: object } = { headers: { Authorization: 'Bearer x' } };

			addTraceHeaders(target, data(), node);

			expect(target.headers).toEqual({ Authorization: 'Bearer x', traceparent: TRACEPARENT });
		});

		test('creates the headers object when the target has none', () => {
			const target: { headers?: object } = {};

			addTraceHeaders(target, data(), node);

			expect(target.headers).toEqual({ traceparent: TRACEPARENT });
		});

		test('leaves headers undefined when there is nothing to add', () => {
			const target: { headers?: object } = {};

			addTraceHeaders(target, additionalDataWith({}), node);

			expect(target.headers).toBeUndefined();
		});

		test('replaces a header with the same name', () => {
			const target: { headers?: object } = { headers: { traceparent: 'stale' } };

			addTraceHeaders(target, data(), node);

			expect(target.headers).toEqual({ traceparent: TRACEPARENT });
		});
	});
});
