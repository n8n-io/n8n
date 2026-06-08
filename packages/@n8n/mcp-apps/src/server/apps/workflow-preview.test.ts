import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerWorkflowPreviewApp } from './workflow-preview';
import {
	RESOURCE_MIME_TYPE,
	WORKFLOW_PREVIEW_APP_URI,
	WORKFLOW_PREVIEW_FRAME_DOMAINS,
} from '../constants';
import { loadAppHtml } from '../resource-loader';
import { MCP_APP_TELEMETRY_GLOBAL, type McpAppTelemetryConfig } from '../telemetry-config';

vi.mock('../resource-loader', () => ({
	loadAppHtml: vi.fn(
		// eslint-disable-next-line @typescript-eslint/require-await
		async (fileName: string) =>
			`<!doctype html><html><head data-file="${fileName}"></head><body>stub</body></html>`,
	),
}));

type ResourceContent = {
	uri: string;
	mimeType: string;
	text: string;
	_meta?: {
		ui?: {
			csp?: { frameDomains?: string[]; resourceDomains?: string[]; connectDomains?: string[] };
			prefersBorder?: boolean;
		};
	};
};

type ResourceCallback = () => Promise<{ contents: ResourceContent[] }>;

type CapturedResource = {
	name: string;
	uri: string;
	metadata: Record<string, unknown>;
	callback: ResourceCallback;
};

const telemetry: McpAppTelemetryConfig = {
	enabled: true,
	writeKey: 'test-write-key',
	dataPlaneUrl: 'https://n8n.example.com/rest/telemetry/proxy',
	configUrl: 'https://n8n.example.com/rest/telemetry/rudderstack',
	instanceId: 'instance-123',
	versionCli: '1.2.3',
};
const instanceOrigin = 'https://n8n.example.com';

describe('registerWorkflowPreviewApp', () => {
	let captured: CapturedResource;
	let onResourceRead: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		captured = undefined as unknown as CapturedResource;
		onResourceRead = vi.fn();
		registerWorkflowPreviewApp(
			{
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
			} as any,
			{
				instanceOrigin,
				telemetry,
				onResourceRead: onResourceRead as () => void,
			},
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('registers the workflow-preview resource with the expected URI and MIME type metadata', () => {
		expect(captured.name).toBe('workflow-preview');
		expect(captured.uri).toBe(WORKFLOW_PREVIEW_APP_URI);
		expect(captured.metadata.mimeType).toBe(RESOURCE_MIME_TYPE);
		expect(captured.metadata.description).toMatch(/workflow/i);
		expect(captured.metadata._meta).toEqual({
			ui: {
				csp: {
					frameDomains: [...WORKFLOW_PREVIEW_FRAME_DOMAINS],
					resourceDomains: ['https://cdn-rs.n8n.io'],
					connectDomains: [instanceOrigin],
				},
				prefersBorder: false,
			},
		});
	});

	it('returns the HTML body with the expected MIME type and URI', async () => {
		const result = await captured.callback();

		expect(result.contents).toHaveLength(1);
		const content = result.contents[0];
		expect(content.uri).toBe(WORKFLOW_PREVIEW_APP_URI);
		expect(content.mimeType).toBe(RESOURCE_MIME_TYPE);
		expect(content.text).toContain('<html');
		expect(content._meta?.ui?.csp?.frameDomains).toEqual([...WORKFLOW_PREVIEW_FRAME_DOMAINS]);
		expect(loadAppHtml).toHaveBeenCalledWith('workflow-preview.html');
	});

	it('declares CSP for the RudderStack CDN and the instance origin', async () => {
		const { _meta } = (await captured.callback()).contents[0];
		const csp = _meta?.ui?.csp;
		expect(csp?.frameDomains).toEqual([...WORKFLOW_PREVIEW_FRAME_DOMAINS]);
		expect(csp?.resourceDomains).toEqual(['https://cdn-rs.n8n.io']);
		expect(csp?.connectDomains).toEqual([instanceOrigin]);
		expect(_meta?.ui?.prefersBorder).toBe(false);
	});

	it('omits telemetry CSP domains when no instance origin is provided', async () => {
		registerWorkflowPreviewApp(
			{
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
			} as any,
			{ telemetry },
		);

		const { _meta } = (await captured.callback()).contents[0];
		const csp = _meta?.ui?.csp;
		expect(csp?.frameDomains).toEqual([...WORKFLOW_PREVIEW_FRAME_DOMAINS]);
		expect(csp?.resourceDomains).toEqual([]);
		expect(csp?.connectDomains).toEqual([]);
		expect(_meta?.ui?.prefersBorder).toBe(false);
	});

	it('injects the telemetry runtime config into the HTML', async () => {
		const { text } = (await captured.callback()).contents[0];
		expect(text).toContain(`window.${MCP_APP_TELEMETRY_GLOBAL}=`);
		expect(text).toContain('"writeKey":"test-write-key"');
		expect(text).toContain('"instanceId":"instance-123"');
	});

	it('invokes onResourceRead when the resource is served', async () => {
		await captured.callback();
		expect(onResourceRead).toHaveBeenCalledTimes(1);
	});

	it('still serves the app HTML when onResourceRead throws', async () => {
		onResourceRead.mockImplementation(() => {
			throw new Error('telemetry boom');
		});

		const result = await captured.callback();

		expect(result.contents[0].text).toContain('<html');
	});
});
