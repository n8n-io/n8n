import { getLastSuccessfulExecution } from './workflows';
import * as apiUtils from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import type { MockInstance } from 'vitest';

vi.mock('@n8n/rest-api-client');

describe('API: workflows', () => {
	describe('getLastSuccessfulExecution', () => {
		let mockContext: IRestApiContext;
		let makeRestApiRequestSpy: MockInstance;

		beforeEach(() => {
			mockContext = {
				baseUrl: 'http://test-base-url',
				sessionId: 'test-session',
				pushRef: 'test-ref',
			} as IRestApiContext;

			makeRestApiRequestSpy = vi.spyOn(apiUtils, 'makeRestApiRequest');
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should call makeRestApiRequest with correct parameters and return execution data', async () => {
			const workflowId = 'workflow-123';
			const mockResponse = {
				id: 'execution-456',
				workflowId,
				mode: 'trigger',
				startedAt: new Date('2025-01-15T10:00:00Z'),
				stoppedAt: new Date('2025-01-15T10:05:00Z'),
				status: 'success',
				finished: true,
			};

			makeRestApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await getLastSuccessfulExecution(mockContext, workflowId);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'GET',
				`/workflows/${workflowId}/executions/last-successful`,
			);
			expect(result).toEqual(mockResponse);
		});

		it('should handle 404 error when no successful execution exists', async () => {
			const workflowId = 'workflow-no-success';
			const error = {
				httpStatusCode: 404,
				message: 'No successful execution found for the workflow',
			};
			makeRestApiRequestSpy.mockRejectedValue(error);

			await expect(getLastSuccessfulExecution(mockContext, workflowId)).rejects.toEqual(error);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'GET',
				`/workflows/${workflowId}/executions/last-successful`,
			);
		});
	});
});
