import { OutboundHttp } from '@n8n/backend-network';
import type { HttpRequestClient, SsrfBridge } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { proxyRequestToAxios } from '../legacy-request-adapter';

type OnFetchedCallbacks = { onFetched?: () => Promise<void> | void };

/**
 * `proxyRequestToAxios` is a thin adapter over {@link OutboundHttp}: it
 * normalises the call arguments, derives the SSRF policy from the execution's
 * `ssrfBridge`, and wires the `nodeFetchedData` hook to the client's `onFetched`
 * callback. The actual request behaviour (SSRF enforcement, redirects, error
 * shapes, domain allowlist) lives with `executeLegacyRequest` and is covered in
 * `@n8n/backend-network`'s `legacy-request.test.ts`. These tests only assert the
 * adapter's wiring contract, so the facade is mocked.
 */
describe('proxyRequestToAxios', () => {
	const workflow = mock<Workflow>({ id: 'workflow-id' });
	const node = mock<INode>();

	const requestLegacy = vi.fn();
	const requests = vi.fn();
	const outboundHttp = mock<OutboundHttp>({ requests });

	beforeEach(() => {
		vi.resetAllMocks();
		requestLegacy.mockResolvedValue('response-body');
		requests.mockReturnValue(mock<HttpRequestClient>({ requestLegacy }));
		Container.set(OutboundHttp, outboundHttp);
	});

	describe('SSRF policy mapping', () => {
		it('disables SSRF when the execution provides no bridge', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({ ssrfBridge: undefined });

			await proxyRequestToAxios(workflow, additionalData, node, 'https://example.test');

			expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
		});

		it('forwards the execution SSRF bridge when present', async () => {
			const ssrfBridge = mock<SsrfBridge>();
			const additionalData = mock<IWorkflowExecuteAdditionalData>({ ssrfBridge });

			await proxyRequestToAxios(workflow, additionalData, node, 'https://example.test');

			expect(requests).toHaveBeenCalledWith({ ssrf: ssrfBridge });
		});

		it('disables SSRF when there is no additionalData at all', async () => {
			await proxyRequestToAxios(workflow, undefined, node, 'https://example.test');

			expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
		});
	});

	describe('request config normalisation', () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>({ ssrfBridge: undefined });

		it('wraps a string uri into a config object', async () => {
			await proxyRequestToAxios(workflow, additionalData, node, 'https://example.test/path');

			expect(requestLegacy).toHaveBeenCalledWith(
				{ uri: 'https://example.test/path' },
				expect.anything(),
			);
		});

		it('merges options into the config when a string uri is given', async () => {
			await proxyRequestToAxios(workflow, additionalData, node, 'https://example.test/path', {
				method: 'POST',
			});

			expect(requestLegacy).toHaveBeenCalledWith(
				{ uri: 'https://example.test/path', method: 'POST' },
				expect.anything(),
			);
		});

		it('passes an options object straight through', async () => {
			const options: IRequestOptions = { uri: 'https://example.test/path', method: 'PUT' };

			await proxyRequestToAxios(workflow, additionalData, node, options);

			expect(requestLegacy).toHaveBeenCalledWith(options, expect.anything());
		});

		it('returns the client response', async () => {
			const result = await proxyRequestToAxios(
				workflow,
				additionalData,
				node,
				'https://example.test',
			);

			expect(result).toBe('response-body');
		});
	});

	describe('nodeFetchedData hook', () => {
		it('fires the hook through the onFetched callback', async () => {
			const runHook = vi.fn();
			const hooks = mock<NonNullable<IWorkflowExecuteAdditionalData['hooks']>>({ runHook });
			const additionalData = mock<IWorkflowExecuteAdditionalData>({ ssrfBridge: undefined, hooks });
			requestLegacy.mockImplementation(async (_opts: unknown, callbacks?: OnFetchedCallbacks) => {
				await callbacks?.onFetched?.();
				return 'ok';
			});

			await proxyRequestToAxios(workflow, additionalData, node, 'https://example.test');

			expect(runHook).toHaveBeenCalledWith('nodeFetchedData', [workflow.id, node]);
		});

		it('does not throw when no hooks are configured', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				ssrfBridge: undefined,
				hooks: undefined,
			});
			requestLegacy.mockImplementation(async (_opts: unknown, callbacks?: OnFetchedCallbacks) => {
				await callbacks?.onFetched?.();
				return 'ok';
			});

			await expect(
				proxyRequestToAxios(workflow, additionalData, node, 'https://example.test'),
			).resolves.toBe('ok');
		});
	});
});
