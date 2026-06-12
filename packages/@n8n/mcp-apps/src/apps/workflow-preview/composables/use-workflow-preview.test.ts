import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref, shallowRef } from 'vue';

import { WORKFLOW_PREVIEW_ORIGIN } from '@mcp-apps/server/constants';

import {
	WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS,
	WORKFLOW_PREVIEW_TELEMETRY_EVENTS,
	WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES,
	WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES,
	WORKFLOW_PREVIEW_TOOL_NAMES,
} from '../constants';
import { useWorkflowPreview } from './use-workflow-preview';

const { telemetryTrack } = vi.hoisted(() => ({
	telemetryTrack: vi.fn(),
}));

vi.mock('@mcp-apps/telemetry', () => ({
	useTelemetry: () => ({
		track: telemetryTrack,
	}),
}));

vi.mock('@mcp-apps/i18n', () => ({
	useI18n: () => ({
		t: (key: string, params?: { count?: number }) =>
			params?.count === undefined ? key : `${key}:${params.count}`,
	}),
}));

const DEFAULT_WORKFLOW_DEMO_URL = `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&canOpenNDV=false&canvasBackground=dots`;
type WorkflowDetailsResult = {
	isError: false;
	structuredContent: {
		workflow: { id: string; nodes: unknown[]; connections: Record<string, unknown> };
	};
};

const flushPromises = async () => {
	await Promise.resolve();
	await nextTick();
};

function createDeferred<T>() {
	let resolve: (value: T) => void;
	let reject: (reason?: unknown) => void;
	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});

	return {
		promise,
		resolve: resolve!,
		reject: reject!,
	};
}

describe('useWorkflowPreview', () => {
	beforeEach(() => {
		telemetryTrack.mockClear();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('clears stale workflow URL state when a rerun returns an invalid URL', async () => {
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef<App>(),
			hostContext: ref<McpUiHostContext>(),
			toolResult,
		});

		toolResult.value = { url: 'https://n8n.example.com/workflow/abc123' };
		await nextTick();

		expect(preview.workflowUrl.value).toBe('https://n8n.example.com/workflow/abc123');
		expect(preview.previewUrl.value).toBe(DEFAULT_WORKFLOW_DEMO_URL);

		toolResult.value = { url: 'javascript:alert(1)' };
		await nextTick();

		expect(preview.workflowUrl.value).toBeUndefined();
		expect(preview.previewUrl.value).toBeUndefined();
	});

	it('clears stale workflow URL state when a rerun returns no URL', async () => {
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef<App>(),
			hostContext: ref<McpUiHostContext>(),
			toolResult,
		});

		toolResult.value = { url: 'https://n8n.example.com/workflow/abc123' };
		await nextTick();

		expect(preview.workflowUrl.value).toBe('https://n8n.example.com/workflow/abc123');
		expect(preview.previewUrl.value).toBe(DEFAULT_WORKFLOW_DEMO_URL);

		toolResult.value = { name: 'Failed rerun' };
		await nextTick();

		expect(preview.workflowUrl.value).toBeUndefined();
		expect(preview.previewUrl.value).toBeUndefined();
	});

	it('ignores stale workflow detail responses when a newer rerun starts', async () => {
		const firstLoad = createDeferred<WorkflowDetailsResult>();
		const secondLoad = createDeferred<WorkflowDetailsResult>();
		const callServerTool = vi
			.fn()
			.mockReturnValueOnce(firstLoad.promise)
			.mockReturnValueOnce(secondLoad.promise);
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool } as unknown as App),
			hostContext: ref<McpUiHostContext>(),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/first',
			workflowId: 'first',
		};
		await nextTick();

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/second',
			workflowId: 'second',
		};
		await nextTick();

		expect(callServerTool).toHaveBeenCalledTimes(2);
		expect(callServerTool).toHaveBeenNthCalledWith(1, {
			name: 'get_workflow_details',
			arguments: { workflowId: 'first' },
		});
		expect(callServerTool).toHaveBeenNthCalledWith(2, {
			name: 'get_workflow_details',
			arguments: { workflowId: 'second' },
		});
		expect(preview.previewWorkflow.value).toBeUndefined();

		secondLoad.resolve({
			isError: false,
			structuredContent: { workflow: { id: 'second', nodes: [], connections: {} } },
		});
		await flushPromises();

		expect(preview.previewWorkflow.value?.id).toBe('second');

		firstLoad.resolve({
			isError: false,
			structuredContent: { workflow: { id: 'first', nodes: [], connections: {} } },
		});
		await flushPromises();

		expect(preview.previewWorkflow.value?.id).toBe('second');
	});

	it('reloads workflow details when a rerun reuses the same workflow ID', async () => {
		const firstLoad = createDeferred<WorkflowDetailsResult>();
		const secondLoad = createDeferred<WorkflowDetailsResult>();
		const callServerTool = vi
			.fn()
			.mockReturnValueOnce(firstLoad.promise)
			.mockReturnValueOnce(secondLoad.promise);
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool } as unknown as App),
			hostContext: ref<McpUiHostContext>(),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/shared',
			workflowId: 'shared',
		};
		await nextTick();

		firstLoad.resolve({
			isError: false,
			structuredContent: { workflow: { id: 'initial', nodes: [], connections: {} } },
		});
		await flushPromises();
		expect(preview.previewWorkflow.value?.id).toBe('initial');

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/shared',
			workflowId: 'shared',
		};
		await nextTick();

		expect(preview.previewWorkflow.value).toBeUndefined();
		expect(callServerTool).toHaveBeenCalledTimes(2);

		secondLoad.resolve({
			isError: false,
			structuredContent: { workflow: { id: 'rerun', nodes: [], connections: {} } },
		});
		await flushPromises();

		expect(preview.previewWorkflow.value?.id).toBe('rerun');
	});

	it('tracks preview rendered successfully only after the workflow is sent to the iframe', async () => {
		const callServerTool = vi.fn().mockResolvedValue({
			isError: false,
			structuredContent: { workflow: { id: 'abc123', nodes: [], connections: {} } },
		});
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool } as unknown as App),
			appSlug: 'workflow-preview',
			hostContext: ref<McpUiHostContext>(),
			hostVersion: shallowRef({ name: 'Claude Desktop', version: '1.2.3' }),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/abc123',
			workflowId: 'abc123',
		};
		await flushPromises();

		expect(telemetryTrack).not.toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDERED_SUCCESSFULLY,
			expect.anything(),
		);
		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_TOOL_CALL_REQUESTED,
			{
				app: 'workflow-preview',
				load_request_id: expect.any(Number),
				mcp_client_name: 'Claude Desktop',
				mcp_client_version: '1.2.3',
				preview_status: 'loading',
				tool_name: WORKFLOW_PREVIEW_TOOL_NAMES.GET_WORKFLOW_DETAILS,
				workflow_id: 'abc123',
			},
		);
		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_TOOL_CALL_COMPLETED,
			expect.objectContaining({
				app: 'workflow-preview',
				load_request_id: expect.any(Number),
				mcp_client_name: 'Claude Desktop',
				mcp_client_version: '1.2.3',
				outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.SUCCESS,
				tool_name: WORKFLOW_PREVIEW_TOOL_NAMES.GET_WORKFLOW_DETAILS,
				workflow_id: 'abc123',
			}),
		);

		preview.previewSent.value = true;
		await nextTick();

		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDERED_SUCCESSFULLY,
			{
				app: 'workflow-preview',
				mcp_client_name: 'Claude Desktop',
				mcp_client_version: '1.2.3',
				preview_status: 'visible',
				workflow_id: 'abc123',
			},
		);
	});

	it('tracks preview render failure when the preview iframe is not supported', async () => {
		const callServerTool = vi.fn().mockResolvedValue({
			isError: false,
			structuredContent: { workflow: { id: 'abc123', nodes: [], connections: {} } },
		});
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool } as unknown as App),
			appSlug: 'workflow-preview',
			hostContext: ref<McpUiHostContext>(),
			hostVersion: shallowRef({ name: 'Claude Desktop', version: '1.2.3' }),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/abc123',
			workflowId: 'abc123',
		};
		await flushPromises();

		preview.handlePreviewError('Preview not supported');
		await nextTick();

		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDER_FAILED,
			{
				app: 'workflow-preview',
				mcp_client_name: 'Claude Desktop',
				mcp_client_version: '1.2.3',
				preview_status: 'error',
				reason: WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.PREVIEW_NOT_SUPPORTED,
				workflow_id: 'abc123',
			},
		);
	});

	it('tracks preview render failure when workflow details cannot be loaded', async () => {
		const callServerTool = vi.fn().mockResolvedValue({ isError: true });
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool } as unknown as App),
			appSlug: 'workflow-preview',
			hostContext: ref<McpUiHostContext>(),
			hostVersion: shallowRef({ name: 'Claude Desktop', version: '1.2.3' }),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/abc123',
			workflowId: 'abc123',
		};
		await flushPromises();

		expect(preview.previewError.value).toBe('workflowPreview.error.detailsUnavailable');
		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_TOOL_CALL_COMPLETED,
			expect.objectContaining({
				app: 'workflow-preview',
				load_request_id: expect.any(Number),
				outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.TOOL_ERROR,
				tool_name: WORKFLOW_PREVIEW_TOOL_NAMES.GET_WORKFLOW_DETAILS,
				workflow_id: 'abc123',
			}),
		);
		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDER_FAILED,
			{
				app: 'workflow-preview',
				mcp_client_name: 'Claude Desktop',
				mcp_client_version: '1.2.3',
				preview_status: 'error',
				reason: WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.WORKFLOW_DETAILS_UNAVAILABLE,
				workflow_id: 'abc123',
			},
		);
	});

	it('tracks preview crashes reported by the preview iframe', async () => {
		const callServerTool = vi.fn().mockResolvedValue({
			isError: false,
			structuredContent: { workflow: { id: 'abc123', nodes: [], connections: {} } },
		});
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool } as unknown as App),
			appSlug: 'workflow-preview',
			hostContext: ref<McpUiHostContext>(),
			hostVersion: shallowRef({ name: 'Claude Desktop', version: '1.2.3' }),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/abc123',
			workflowId: 'abc123',
		};
		await flushPromises();

		preview.handlePreviewCrash('iframe crashed with Authorization: Bearer abc.def-ghi_jkl/mno=');
		await nextTick();

		expect(telemetryTrack).toHaveBeenCalledWith(WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_CRASHED, {
			app: 'workflow-preview',
			error_message: 'iframe crashed with [REDACTED]',
			mcp_client_name: 'Claude Desktop',
			mcp_client_version: '1.2.3',
			preview_status: 'visible',
			source: 'preview_iframe_error',
			workflow_id: 'abc123',
		});
		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDER_FAILED,
			{
				app: 'workflow-preview',
				mcp_client_name: 'Claude Desktop',
				mcp_client_version: '1.2.3',
				preview_status: 'error',
				reason: WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.PREVIEW_CRASHED,
				workflow_id: 'abc123',
			},
		);
	});

	it('tracks Open in n8n clicks for valid workflow URLs', async () => {
		const callServerTool = vi.fn(async () => await new Promise(() => {}));
		const openLink = vi.fn().mockResolvedValue({ isError: false });
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool, openLink } as unknown as App),
			appSlug: 'workflow-preview',
			hostContext: ref<McpUiHostContext>(),
			hostVersion: shallowRef({ name: 'Claude Desktop', version: '1.2.3' }),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/abc123',
			workflowId: 'abc123',
		};
		await nextTick();

		await preview.handleOpenWorkflow(WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES.PREVIEW_HEADER);

		expect(telemetryTrack).toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.OPEN_IN_N8N_CLICKED,
			{
				app: 'workflow-preview',
				mcp_client_name: 'Claude Desktop',
				mcp_client_version: '1.2.3',
				preview_status: 'loading',
				source: WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES.PREVIEW_HEADER,
				workflow_id: 'abc123',
			},
		);
		expect(openLink).toHaveBeenCalledWith({ url: 'https://n8n.example.com/workflow/abc123' });
	});

	it('does not track Open in n8n clicks for invalid workflow URLs', async () => {
		const openLink = vi.fn().mockResolvedValue({ isError: false });
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ openLink } as unknown as App),
			hostContext: ref<McpUiHostContext>(),
			toolResult,
		});

		toolResult.value = { url: 'javascript:alert(1)', workflowId: 'abc123' };
		await nextTick();

		await preview.handleOpenWorkflow();

		expect(telemetryTrack).not.toHaveBeenCalledWith(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.OPEN_IN_N8N_CLICKED,
			expect.anything(),
		);
		expect(openLink).not.toHaveBeenCalled();
	});
});
