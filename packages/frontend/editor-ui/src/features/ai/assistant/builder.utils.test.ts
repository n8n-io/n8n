import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import {
	extractRevertVersionIds,
	fetchExistingVersionIds,
	enrichMessagesWithRevertVersion,
	createBuilderPayload,
} from './builder.utils';
import type { IWorkflowDb } from '@/Interface';
import type { IRunExecutionData } from 'n8n-workflow';

// Mock workflowHistory API
vi.mock('@n8n/rest-api-client/api/workflowHistory', () => ({
	getWorkflowVersionsByIds: vi.fn(),
}));

// Mock useAIAssistantHelpers
const mockSimplifyWorkflowForAssistant = vi.fn();
const mockSimplifyResultData = vi.fn();
const mockExtractExpressionsFromWorkflow = vi.fn();
const mockGetNodesSchemas = vi.fn();

vi.mock('./composables/useAIAssistantHelpers', () => ({
	useAIAssistantHelpers: () => ({
		simplifyWorkflowForAssistant: mockSimplifyWorkflowForAssistant,
		simplifyResultData: mockSimplifyResultData,
		extractExpressionsFromWorkflow: mockExtractExpressionsFromWorkflow,
		getNodesSchemas: mockGetNodesSchemas,
	}),
}));

// Mock usePostHog
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: vi.fn().mockReturnValue('control'),
		isFeatureEnabled: vi.fn().mockReturnValue(false),
	}),
}));

vi.mock('@/features/ai/assistant/focusedNodes.store', () => ({
	useFocusedNodesStore: () => ({
		buildContextPayload: vi.fn().mockReturnValue([]),
	}),
}));

describe('builder.utils', () => {
	describe('extractRevertVersionIds', () => {
		it('should extract revertVersionId from messages that have them', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'assistant',
					text: 'Created workflow',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'user',
					text: 'Update workflow',
					revertVersionId: 'version-2',
				} as ChatRequest.TextMessage,
			];

			const result = extractRevertVersionIds(messages);

			expect(result).toEqual(['version-1', 'version-2']);
		});

		it('should return empty array when no messages have revertVersionId', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'assistant',
					text: 'Created workflow',
				} as ChatRequest.TextMessage,
			];

			const result = extractRevertVersionIds(messages);

			expect(result).toEqual([]);
		});

		it('should return empty array for empty messages array', () => {
			const result = extractRevertVersionIds([]);

			expect(result).toEqual([]);
		});

		it('should ignore messages where revertVersionId is not a string', () => {
			const messages = [
				{
					type: 'message',
					role: 'user',
					text: 'Test',
					revertVersionId: 123,
				},
				{
					type: 'message',
					role: 'user',
					text: 'Test 2',
					revertVersionId: null,
				},
				{
					type: 'message',
					role: 'user',
					text: 'Valid',
					revertVersionId: 'version-1',
				},
			] as unknown as ChatRequest.MessageResponse[];

			const result = extractRevertVersionIds(messages);

			expect(result).toEqual(['version-1']);
		});
	});

	describe('fetchExistingVersionIds', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should return empty map when versionIds array is empty', async () => {
			const restApiContext = { baseUrl: 'http://test.com' };

			const result = await fetchExistingVersionIds(
				restApiContext as Parameters<typeof fetchExistingVersionIds>[0],
				'workflow-1',
				[],
			);

			expect(result).toEqual(new Map());
		});

		it('should return map of existing versions', async () => {
			const restApiContext = { baseUrl: 'http://test.com' };
			const workflowHistoryModule = await import('@n8n/rest-api-client/api/workflowHistory');

			vi.mocked(workflowHistoryModule.getWorkflowVersionsByIds).mockResolvedValueOnce({
				versions: [
					{ versionId: 'version-1', createdAt: '2024-01-01T00:00:00Z' },
					{ versionId: 'version-2', createdAt: '2024-01-02T00:00:00Z' },
				],
			});

			const result = await fetchExistingVersionIds(
				restApiContext as Parameters<typeof fetchExistingVersionIds>[0],
				'workflow-1',
				['version-1', 'version-2'],
			);

			expect(result).toEqual(
				new Map([
					['version-1', '2024-01-01T00:00:00Z'],
					['version-2', '2024-01-02T00:00:00Z'],
				]),
			);

			expect(workflowHistoryModule.getWorkflowVersionsByIds).toHaveBeenCalledWith(
				restApiContext,
				'workflow-1',
				['version-1', 'version-2'],
			);
		});

		it('should return empty map when API call fails', async () => {
			const restApiContext = { baseUrl: 'http://test.com' };
			const workflowHistoryModule = await import('@n8n/rest-api-client/api/workflowHistory');

			vi.mocked(workflowHistoryModule.getWorkflowVersionsByIds).mockRejectedValueOnce(
				new Error('API error'),
			);

			const result = await fetchExistingVersionIds(
				restApiContext as Parameters<typeof fetchExistingVersionIds>[0],
				'workflow-1',
				['version-1'],
			);

			expect(result).toEqual(new Map());
		});
	});

	describe('enrichMessagesWithRevertVersion', () => {
		it('should enrich messages with revertVersion when version exists in map', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map([['version-1', '2024-01-01T00:00:00Z']]);

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				type: 'message',
				role: 'user',
				text: 'Create workflow',
				revertVersion: {
					id: 'version-1',
					createdAt: '2024-01-01T00:00:00Z',
				},
			});
		});

		it('should remove revertVersionId when version does not exist in map', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map<string, string>();

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toHaveLength(1);
			expect(result[0]).not.toHaveProperty('revertVersionId');
			expect(result[0]).not.toHaveProperty('revertVersion');
			expect(result[0]).toMatchObject({
				type: 'message',
				role: 'user',
				text: 'Create workflow',
			});
		});

		it('should not modify messages without revertVersionId', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Here is your workflow',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map([['version-1', '2024-01-01T00:00:00Z']]);

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toEqual(messages);
		});

		it('should handle mixed messages correctly', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'First message',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'assistant',
					text: 'Response',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'user',
					text: 'Second message',
					revertVersionId: 'version-2',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'user',
					text: 'Third message (version deleted)',
					revertVersionId: 'version-3',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map([
				['version-1', '2024-01-01T00:00:00Z'],
				['version-2', '2024-01-02T00:00:00Z'],
				// version-3 not in map (simulating deleted version)
			]);

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toHaveLength(4);

			// First message should have revertVersion
			expect(result[0]).toHaveProperty('revertVersion', {
				id: 'version-1',
				createdAt: '2024-01-01T00:00:00Z',
			});

			// Second message should be unchanged
			expect(result[1]).not.toHaveProperty('revertVersionId');
			expect(result[1]).not.toHaveProperty('revertVersion');

			// Third message should have revertVersion
			expect(result[2]).toHaveProperty('revertVersion', {
				id: 'version-2',
				createdAt: '2024-01-02T00:00:00Z',
			});

			// Fourth message should have revertVersionId removed (version doesn't exist)
			expect(result[3]).not.toHaveProperty('revertVersionId');
			expect(result[3]).not.toHaveProperty('revertVersion');
			expect(result[3]).toMatchObject({
				type: 'message',
				role: 'user',
				text: 'Third message (version deleted)',
			});
		});

		it('should return empty array for empty messages array', () => {
			const result = enrichMessagesWithRevertVersion([], new Map());

			expect(result).toEqual([]);
		});
	});

	describe('createBuilderPayload', () => {
		const mockWorkflow = {
			id: 'workflow-1',
			name: 'Test Workflow',
			active: false,
			nodes: [
				{
					id: 'node-1',
					name: 'Node 1',
					type: 'test',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			],
			connections: {},
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
		} as IWorkflowDb;

		const mockExecutionData = {
			runData: {
				'Node 1': [{ startTime: 123, executionTime: 100, executionIndex: 0, source: [] }],
			},
		} as IRunExecutionData['resultData'];

		beforeEach(() => {
			vi.clearAllMocks();

			// Setup default mock implementations
			mockSimplifyWorkflowForAssistant.mockResolvedValue({
				name: mockWorkflow.name,
				active: mockWorkflow.active,
				nodes: mockWorkflow.nodes,
				connections: mockWorkflow.connections,
			});
			mockSimplifyResultData.mockReturnValue({ runData: {} });
			mockExtractExpressionsFromWorkflow.mockResolvedValue({});
			mockGetNodesSchemas.mockReturnValue({
				schemas: [{ nodeName: 'Node 1', schema: {} }],
				pinnedNodeNames: [],
			});
		});

		it('should include executionData and expressionValues when allowSendingParameterValues is true', async () => {
			const result = await createBuilderPayload('test message', 'msg-1', {
				workflow: mockWorkflow,
				executionData: mockExecutionData,
				nodesForSchema: ['Node 1'],
				allowSendingParameterValues: true,
			});

			expect(mockSimplifyWorkflowForAssistant).toHaveBeenCalledWith(mockWorkflow, {
				excludeParameterValues: false,
			});
			expect(mockSimplifyResultData).toHaveBeenCalledWith(mockExecutionData, {
				compact: true,
				removeParameterValues: false,
			});
			expect(mockExtractExpressionsFromWorkflow).toHaveBeenCalledWith(
				mockWorkflow,
				mockExecutionData,
			);
			expect(result.workflowContext?.executionData).toBeDefined();
		});

		it('should include executionData and expressionValues when allowSendingParameterValues is undefined (default)', async () => {
			const result = await createBuilderPayload('test message', 'msg-1', {
				workflow: mockWorkflow,
				executionData: mockExecutionData,
				nodesForSchema: ['Node 1'],
			});

			expect(mockSimplifyWorkflowForAssistant).toHaveBeenCalledWith(mockWorkflow, {
				excludeParameterValues: false,
			});
			expect(mockSimplifyResultData).toHaveBeenCalledWith(mockExecutionData, {
				compact: true,
				removeParameterValues: false,
			});
			expect(mockExtractExpressionsFromWorkflow).toHaveBeenCalledWith(
				mockWorkflow,
				mockExecutionData,
			);
			expect(result.workflowContext?.executionData).toBeDefined();
		});

		it('should include executionData but NOT expressionValues when allowSendingParameterValues is false', async () => {
			const result = await createBuilderPayload('test message', 'msg-1', {
				workflow: mockWorkflow,
				executionData: mockExecutionData,
				nodesForSchema: ['Node 1'],
				allowSendingParameterValues: false,
			});

			expect(mockSimplifyWorkflowForAssistant).toHaveBeenCalledWith(mockWorkflow, {
				excludeParameterValues: true,
			});
			// executionData is sent but with removeParameterValues flag
			expect(mockSimplifyResultData).toHaveBeenCalledWith(mockExecutionData, {
				compact: true,
				removeParameterValues: true,
			});
			// expressionValues are NOT sent when privacy is OFF
			expect(mockExtractExpressionsFromWorkflow).not.toHaveBeenCalled();
			expect(result.workflowContext?.executionData).toBeDefined();
			expect(result.workflowContext?.expressionValues).toBeUndefined();
		});

		it('should always include executionSchema regardless of privacy setting', async () => {
			const result = await createBuilderPayload('test message', 'msg-1', {
				workflow: mockWorkflow,
				executionData: mockExecutionData,
				nodesForSchema: ['Node 1'],
				allowSendingParameterValues: false,
			});

			expect(mockGetNodesSchemas).toHaveBeenCalledWith(['Node 1'], true);
			expect(result.workflowContext?.executionSchema).toBeDefined();
		});

		it('should include workflow in payload when privacy is OFF but with trimmed parameter values', async () => {
			const result = await createBuilderPayload('test message', 'msg-1', {
				workflow: mockWorkflow,
				allowSendingParameterValues: false,
			});

			expect(mockSimplifyWorkflowForAssistant).toHaveBeenCalledWith(mockWorkflow, {
				excludeParameterValues: true,
			});
			expect(result.workflowContext?.currentWorkflow).toBeDefined();
		});
	});
});
