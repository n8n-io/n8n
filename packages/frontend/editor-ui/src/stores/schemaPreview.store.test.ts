import { createPinia, setActivePinia } from 'pinia';
import { useSchemaPreviewStore } from './schemaPreview.store';
import * as schemaPreviewApi from '@/api/schemaPreview';
import type { JSONSchema7 } from 'json-schema';
import { mock } from 'vitest-mock-extended';
import type { PushPayload } from '@n8n/api-types';
import { useTelemetry } from '../composables/useTelemetry';
import type { INode } from 'n8n-workflow';
import { useWorkflowsStore } from './workflows.store';

vi.mock('@/api/schemaPreview');
vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return { track };
		},
	};
});

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		baseUrl: 'https://test.com',
	})),
}));

vi.mock('@/stores/workflows.store', () => {
	const getNodeByName = vi.fn();
	return {
		useWorkflowsStore: vi.fn(() => ({
			workflowId: '123',
			getNodeByName,
		})),
	};
});

describe('schemaPreview.store', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setActivePinia(createPinia());
	});

	describe('getSchemaPreview', () => {
		it('should fetch schema preview and cache', async () => {
			const store = useSchemaPreviewStore();

			const schemaPreviewApiSpy = vi.mocked(schemaPreviewApi.getSchemaPreview);
			const mockedSchema: JSONSchema7 = {
				type: 'object',
				properties: { foo: { type: 'string' } },
			};
			schemaPreviewApiSpy.mockResolvedValueOnce(mockedSchema);

			const options = {
				nodeType: 'n8n-nodes-base.test',
				version: 1.2,
				resource: 'messages',
				operation: 'send',
			};
			const result = await store.getSchemaPreview(options);
			expect(schemaPreviewApiSpy).toHaveBeenCalledTimes(1);

			expect(result).toEqual({ ok: true, result: mockedSchema });

			const result2 = await store.getSchemaPreview(options);
			expect(schemaPreviewApiSpy).toHaveBeenCalledTimes(1);
			expect(result2).toEqual({ ok: true, result: mockedSchema });
		});

		it('should handle errors', async () => {
			const store = useSchemaPreviewStore();

			const schemaPreviewApiSpy = vi.mocked(schemaPreviewApi.getSchemaPreview);
			const error = new Error('Not Found');
			schemaPreviewApiSpy.mockRejectedValueOnce(error);

			const options = {
				nodeType: 'n8n-nodes-base.test',
				version: 1.2,
				resource: 'messages',
				operation: 'send',
			};
			const result = await store.getSchemaPreview(options);

			expect(result).toEqual({ ok: false, error });
		});
	});

	describe('trackSchemaPreviewExecution', () => {
		const options = {
			nodeType: 'n8n-nodes-base.test',
			version: 1.2,
			resource: 'messages',
			operation: 'send',
		};

		beforeEach(async () => {
			const store = useSchemaPreviewStore();

			const schemaPreviewApiSpy = vi.mocked(schemaPreviewApi.getSchemaPreview);
			const mockedSchema: JSONSchema7 = {
				type: 'object',
				properties: { foo: { type: 'string' } },
			};
			schemaPreviewApiSpy.mockResolvedValueOnce(mockedSchema);

			// Populate the schema preview cache
			await store.getSchemaPreview(options);
		});

		it('should track both the preview schema and the output one', async () => {
			const store = useSchemaPreviewStore();
			vi.mocked(useWorkflowsStore().getNodeByName).mockReturnValueOnce(
				mock<INode>({
					id: 'test-node-id',
					type: options.nodeType,
					typeVersion: options.version,
					parameters: { resource: options.resource, operation: options.operation },
				}),
			);
			await store.trackSchemaPreviewExecution(
				mock<PushPayload<'nodeExecuteAfterData'>>({
					nodeName: 'Test',
					data: {
						executionStatus: 'success',
						data: { main: [[{ json: { foo: 'bar', quz: 'qux' } }]] },
					},
				}),
			);

			expect(useTelemetry().track).toHaveBeenCalledWith('User executed node with schema preview', {
				node_id: 'test-node-id',
				node_operation: 'send',
				node_resource: 'messages',
				node_type: 'n8n-nodes-base.test',
				node_version: 1.2,
				output_schema:
					'{"type":"object","properties":{"foo":{"type":"string"},"quz":{"type":"string"}}}',
				schema_preview: '{"type":"object","properties":{"foo":{"type":"string"}}}',
				workflow_id: '123',
			});
		});

		it('should not track nodes without a schema preview', async () => {
			const store = useSchemaPreviewStore();
			vi.mocked(useWorkflowsStore().getNodeByName).mockReturnValueOnce(mock<INode>());
			await store.trackSchemaPreviewExecution(
				mock<PushPayload<'nodeExecuteAfterData'>>({
					nodeName: 'Test',
					data: {
						executionStatus: 'success',
						data: { main: [[{ json: { foo: 'bar', quz: 'qux' } }]] },
					},
				}),
			);

			expect(useTelemetry().track).not.toHaveBeenCalled();
		});

		it('should not track failed executions', async () => {
			const store = useSchemaPreviewStore();
			await store.trackSchemaPreviewExecution(
				mock<PushPayload<'nodeExecuteAfterData'>>({
					data: {
						executionStatus: 'error',
					},
				}),
			);

			expect(useTelemetry().track).not.toHaveBeenCalled();
		});
	});
});
