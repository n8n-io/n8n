import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerWorkflowPreviewApp } from './workflow-preview';
import { RESOURCE_MIME_TYPE, WORKFLOW_PREVIEW_APP_URI } from '../constants';
import { loadAppHtml } from '../resource-loader';

vi.mock('../resource-loader', () => ({
	// eslint-disable-next-line @typescript-eslint/require-await
	loadAppHtml: vi.fn(async (fileName: string) => `<html data-file="${fileName}">stub</html>`),
}));

type ResourceCallback = () => Promise<{
	contents: Array<{ uri: string; mimeType: string; text: string }>;
}>;

type CapturedResource = {
	name: string;
	uri: string;
	metadata: Record<string, unknown>;
	callback: ResourceCallback;
};

describe('registerWorkflowPreviewApp', () => {
	let captured: CapturedResource;

	beforeEach(() => {
		captured = undefined as unknown as CapturedResource;
		registerWorkflowPreviewApp({
			resource: (
				name: string,
				uri: string,
				metadata: Record<string, unknown>,
				callback: ResourceCallback,
			) => {
				captured = { name, uri, metadata, callback };
				return undefined as never;
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('registers the workflow-preview resource with the expected URI and MIME type metadata', () => {
		expect(captured.name).toBe('workflow-preview');
		expect(captured.uri).toBe(WORKFLOW_PREVIEW_APP_URI);
		expect(captured.metadata.mimeType).toBe(RESOURCE_MIME_TYPE);
		expect(captured.metadata.description).toMatch(/workflow/i);
	});

	it('returns the HTML body with the expected MIME type and URI', async () => {
		const result = await captured.callback();

		expect(result.contents).toHaveLength(1);
		const content = result.contents[0];
		expect(content.uri).toBe(WORKFLOW_PREVIEW_APP_URI);
		expect(content.mimeType).toBe(RESOURCE_MIME_TYPE);
		expect(content.text).toContain('<html');
		expect(loadAppHtml).toHaveBeenCalledWith('workflow-preview.html');
	});
});
