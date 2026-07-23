import { startTestRun } from './evaluation.api';
import * as restApiClient from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client', () => ({
	request: vi.fn(),
	makeRestApiRequest: vi.fn(),
}));

const MOCK_CONTEXT: IRestApiContext = {
	baseUrl: 'http://localhost:5678',
	pushRef: 'test-push-ref',
} as IRestApiContext;

describe('evaluation.api — startTestRun', () => {
	let requestSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		requestSpy = vi.spyOn(restApiClient, 'request').mockResolvedValue({
			success: true,
			testRunId: 'run-abc',
		});
	});

	it('sends no body when called with no options', async () => {
		await startTestRun(MOCK_CONTEXT, 'wf-1');

		expect(requestSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				endpoint: '/workflows/wf-1/test-runs/new',
				data: undefined,
			}),
		);
	});

	it('includes rowIndices in the request body when provided', async () => {
		await startTestRun(MOCK_CONTEXT, 'wf-1', {
			evaluationConfigId: 'config-1',
			compileFromConfig: true,
			rowIndices: [2],
		});

		expect(requestSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ rowIndices: [2] }),
			}),
		);
	});

	it('does not include rowIndices in the body when omitted', async () => {
		await startTestRun(MOCK_CONTEXT, 'wf-1', {
			evaluationConfigId: 'config-1',
			compileFromConfig: true,
		});

		const callArgs = requestSpy.mock.calls[0][0] as { data?: Record<string, unknown> };
		expect(callArgs.data).toBeDefined();
		expect(callArgs.data).not.toHaveProperty('rowIndices');
	});

	it('forwards rowIndices alongside other options', async () => {
		await startTestRun(MOCK_CONTEXT, 'wf-1', {
			concurrency: 3,
			evaluationConfigId: 'config-1',
			compileFromConfig: true,
			rowIndices: [0, 4, 7],
		});

		expect(requestSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					concurrency: 3,
					evaluationConfigId: 'config-1',
					compileFromConfig: true,
					rowIndices: [0, 4, 7],
				},
			}),
		);
	});
});
