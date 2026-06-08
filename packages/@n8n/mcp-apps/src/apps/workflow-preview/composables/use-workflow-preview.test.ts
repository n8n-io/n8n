import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref, shallowRef } from 'vue';

import { WORKFLOW_PREVIEW_ORIGIN } from '@mcp-apps/server/constants';

import { useWorkflowPreview } from './use-workflow-preview';

const { telemetryTrack } = vi.hoisted(() => ({
	telemetryTrack: vi.fn(),
}));

vi.mock('@mcp-apps/telemetry', () => ({
	MCP_APP_EVENTS: {
		OPEN_IN_N8N_CLICKED: 'MCP App Open in n8n clicked',
	},
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

	it('tracks Open in n8n clicks for valid workflow URLs', async () => {
		const callServerTool = vi.fn(async () => await new Promise(() => {}));
		const openLink = vi.fn().mockResolvedValue({ isError: false });
		const toolResult = shallowRef<unknown>();
		const preview = useWorkflowPreview({
			app: shallowRef({ callServerTool, openLink } as unknown as App),
			appSlug: 'workflow-preview',
			hostContext: ref<McpUiHostContext>(),
			toolResult,
		});

		toolResult.value = {
			url: 'https://n8n.example.com/workflow/abc123',
			workflowId: 'abc123',
		};
		await nextTick();

		await preview.handleOpenWorkflow();

		expect(telemetryTrack).toHaveBeenCalledWith('MCP App Open in n8n clicked', {
			app: 'workflow-preview',
			preview_status: 'loading',
			workflow_id: 'abc123',
		});
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

		expect(telemetryTrack).not.toHaveBeenCalled();
		expect(openLink).not.toHaveBeenCalled();
	});
});
