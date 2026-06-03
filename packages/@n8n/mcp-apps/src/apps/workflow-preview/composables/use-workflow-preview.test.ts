import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref, shallowRef } from 'vue';

import { WORKFLOW_PREVIEW_ORIGIN } from '@mcp-apps/server/constants';

import { useWorkflowPreview } from './use-workflow-preview';

vi.mock('@mcp-apps/i18n', () => ({
	useI18n: () => ({
		t: (key: string, params?: { count?: number }) =>
			params?.count === undefined ? key : `${key}:${params.count}`,
	}),
}));

const DEFAULT_WORKFLOW_DEMO_URL = `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&canOpenNDV=false&canvasBackground=dots`;

describe('useWorkflowPreview', () => {
	beforeEach(() => {
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
});
