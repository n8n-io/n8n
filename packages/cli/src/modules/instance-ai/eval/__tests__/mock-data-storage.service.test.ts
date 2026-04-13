import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository } from '@n8n/db';

import { MockDataStorageService } from '../mock-data-storage.service';

describe('MockDataStorageService', () => {
	const logger = mock<Logger>();
	const workflowRepository = mock<WorkflowRepository>();
	const service = new MockDataStorageService(workflowRepository, logger);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const makeResult = (
		nodeResults: InstanceAiEvalExecutionResult['nodeResults'],
	): InstanceAiEvalExecutionResult => ({
		executionId: 'test-exec',
		success: true,
		nodeResults,
		errors: [],
		hints: {
			globalContext: '',
			triggerContent: {},
			nodeHints: {},
			warnings: [],
			bypassPinData: {},
		},
	});

	describe('persistAsPinData', () => {
		it('should persist mocked and pinned nodes with output', async () => {
			const result = makeResult({
				Webhook: {
					output: [{ json: { name: 'test' } }],
					interceptedRequests: [],
					executionMode: 'pinned',
				},
				'HTTP Request': {
					output: [{ json: { id: 1, title: 'Hello' } }],
					interceptedRequests: [],
					executionMode: 'mocked',
				},
				'Set Node': {
					output: [{ json: { processed: true } }],
					interceptedRequests: [],
					executionMode: 'real',
				},
			});

			const persisted = await service.persistAsPinData('wf-123', result);

			expect(persisted).toBe(true);
			expect(workflowRepository.update).toHaveBeenCalledWith('wf-123', {
				pinData: {
					Webhook: [{ json: { name: 'test' } }],
					'HTTP Request': [{ json: { id: 1, title: 'Hello' } }],
				},
			});
		});

		it('should skip real execution mode nodes', async () => {
			const result = makeResult({
				'Code Node': {
					output: [{ json: { result: 42 } }],
					interceptedRequests: [],
					executionMode: 'real',
				},
			});

			const persisted = await service.persistAsPinData('wf-123', result);

			expect(persisted).toBe(false);
			expect(workflowRepository.update).not.toHaveBeenCalled();
		});

		it('should skip nodes with null output', async () => {
			const result = makeResult({
				'HTTP Request': {
					output: null,
					interceptedRequests: [],
					executionMode: 'mocked',
				},
			});

			const persisted = await service.persistAsPinData('wf-123', result);

			expect(persisted).toBe(false);
			expect(workflowRepository.update).not.toHaveBeenCalled();
		});

		it('should throw on database errors', async () => {
			const result = makeResult({
				'HTTP Request': {
					output: [{ json: { ok: true } }],
					interceptedRequests: [],
					executionMode: 'mocked',
				},
			});

			workflowRepository.update.mockRejectedValueOnce(new Error('DB connection failed'));

			await expect(service.persistAsPinData('wf-123', result)).rejects.toThrow(
				'DB connection failed',
			);
		});

		it('should handle items without json property gracefully', async () => {
			const result = makeResult({
				'HTTP Request': {
					output: [{ notJson: true }, { json: { valid: true } }],
					interceptedRequests: [],
					executionMode: 'mocked',
				},
			});

			const persisted = await service.persistAsPinData('wf-123', result);

			expect(persisted).toBe(true);
			expect(workflowRepository.update).toHaveBeenCalledWith('wf-123', {
				pinData: {
					'HTTP Request': [{ json: { valid: true } }],
				},
			});
		});
	});
});
