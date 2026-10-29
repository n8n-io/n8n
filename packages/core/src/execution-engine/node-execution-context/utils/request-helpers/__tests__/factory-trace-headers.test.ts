import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { INode, IWorkflowExecuteAdditionalData, Workflow } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getRequestHelperFunctions } from '../factory';

const TRACE_HEADERS = {
	traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
	tracestate: 'vendor=opaque',
};

describe('request helpers trace context', () => {
	const workflow = mock<Workflow>();
	const node = mock<INode>({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' });

	function helpersWith(options: {
		executionId?: string;
		inject?: (
			executionId: string,
			nodeName: string | undefined,
			headers: Record<string, string>,
		) => void;
	}) {
		const additionalData =
			mockDeep<IWorkflowExecuteAdditionalData>() as IWorkflowExecuteAdditionalData;
		additionalData.evalLlmMockHandler = undefined;
		additionalData.executionId = options.executionId;
		additionalData.otel = options.inject ? { injectTraceHeaders: options.inject } : undefined;
		return { helpers: getRequestHelperFunctions(workflow, node, additionalData), additionalData };
	}

	const writesTraceHeaders = vi.fn(
		(_executionId: string, _nodeName: string | undefined, headers: Record<string, string>) => {
			Object.assign(headers, TRACE_HEADERS);
		},
	);

	beforeEach(() => vi.clearAllMocks());

	describe('getTraceHeaders', () => {
		it('returns what the tracer wrote, for the running execution and node', () => {
			const { helpers } = helpersWith({ executionId: 'exec-1', inject: writesTraceHeaders });

			expect(helpers.getTraceHeaders()).toEqual(TRACE_HEADERS);
			expect(writesTraceHeaders.mock.calls[0].slice(0, 2)).toEqual(['exec-1', 'HTTP Request']);
		});

		it('returns nothing when the otel module is not loaded', () => {
			const { helpers } = helpersWith({ executionId: 'exec-1' });

			expect(helpers.getTraceHeaders()).toEqual({});
		});

		it('reads the execution id for each call, because the runner sets it after this factory runs', () => {
			const { helpers, additionalData } = helpersWith({ inject: writesTraceHeaders });
			expect(helpers.getTraceHeaders()).toEqual({});

			additionalData.executionId = 'exec-late';

			expect(helpers.getTraceHeaders()).toEqual(TRACE_HEADERS);
			expect(writesTraceHeaders.mock.calls[0].slice(0, 2)).toEqual(['exec-late', 'HTTP Request']);
		});
	});

	describe('httpRequest', () => {
		function captureRequest() {
			const request = vi.fn().mockResolvedValue({ ok: true });
			Container.set(OutboundHttp, mock<OutboundHttp>({ requests: () => ({ request }) as never }));
			return request;
		}

		afterEach(() => Container.reset());

		it('sends the trace headers', async () => {
			const request = captureRequest();
			const { helpers } = helpersWith({ executionId: 'exec-1', inject: writesTraceHeaders });

			await helpers.httpRequest({ url: 'https://example.com' });

			expect(request).toHaveBeenCalledWith(expect.objectContaining({ headers: TRACE_HEADERS }));
		});

		it('keeps the headers the node set', async () => {
			const request = captureRequest();
			const { helpers } = helpersWith({ executionId: 'exec-1', inject: writesTraceHeaders });

			await helpers.httpRequest({
				url: 'https://example.com',
				headers: { 'X-Custom': 'kept' },
			});

			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({ headers: { 'X-Custom': 'kept', ...TRACE_HEADERS } }),
			);
		});

		it('leaves the request untouched when there is no trace context', async () => {
			const request = captureRequest();
			const { helpers } = helpersWith({ executionId: 'exec-1' });

			await helpers.httpRequest({ url: 'https://example.com' });

			expect(request.mock.calls[0][0].headers).toBeUndefined();
		});
	});
});
