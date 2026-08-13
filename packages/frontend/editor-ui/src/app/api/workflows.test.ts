import { getLastSuccessfulExecution, getNewWorkflowData } from './workflows';
import { DEFAULT_NEW_WORKFLOW_NAME, DEFAULT_SETTINGS } from '@/app/constants/workflows';
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

		it('should return null when no successful execution exists', async () => {
			const workflowId = 'workflow-no-success';
			makeRestApiRequestSpy.mockResolvedValue(null);

			const result = await getLastSuccessfulExecution(mockContext, workflowId);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'GET',
				`/workflows/${workflowId}/executions/last-successful`,
			);
			expect(result).toBeNull();
		});
	});

	describe('getNewWorkflowData', () => {
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

		it('should request new workflow data and map the response', async () => {
			const serverSettings = { executionOrder: 'v1' };
			makeRestApiRequestSpy.mockResolvedValue({
				name: 'Server Name',
				defaultSettings: serverSettings,
			});

			const result = await getNewWorkflowData(mockContext, 'My Name', 'project-1', 'folder-1');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(mockContext, 'GET', '/workflows/new', {
				name: 'My Name',
				projectId: 'project-1',
				parentFolderId: 'folder-1',
			});
			expect(result).toEqual({ name: 'Server Name', settings: serverSettings });
		});

		it('should send no payload when all parameters are empty', async () => {
			makeRestApiRequestSpy.mockResolvedValue({
				name: 'Server Name',
				defaultSettings: {},
			});

			await getNewWorkflowData(mockContext);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'GET',
				'/workflows/new',
				undefined,
			);
		});

		it('should fall back to the provided name and default settings on error', async () => {
			makeRestApiRequestSpy.mockRejectedValue(new Error('request failed'));

			const result = await getNewWorkflowData(mockContext, 'My Name');

			expect(result).toEqual({ name: 'My Name', settings: { ...DEFAULT_SETTINGS } });
		});

		it('should fall back to the default workflow name when none is provided and the request fails', async () => {
			makeRestApiRequestSpy.mockRejectedValue(new Error('request failed'));

			const result = await getNewWorkflowData(mockContext);

			expect(result).toEqual({
				name: DEFAULT_NEW_WORKFLOW_NAME,
				settings: { ...DEFAULT_SETTINGS },
			});
		});
	});
});
