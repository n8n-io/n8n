import { describe, expect, it } from 'vitest';

import {
	applyWorkflowDemoTheme,
	buildWorkflowDemoUrl,
	isAllowedWorkflowDemoUrl,
	isAllowedWorkflowUrl,
	resolveWorkflowDemoUrl,
} from './url';

describe('isAllowedWorkflowUrl', () => {
	describe('accepts', () => {
		it.each([
			['https URL with path', 'https://n8n.example.com/workflow/abc123'],
			['http URL', 'http://localhost:5678/workflow/abc123'],
			['https with port', 'https://n8n.example.com:8443/workflow/abc123'],
			['https with query and fragment', 'https://n8n.example.com/workflow/abc?x=1#y'],
			['n8n.cloud subdomain', 'https://workspace.app.n8n.cloud/workflow/abc123'],
		])('%s', (_label, input) => {
			expect(isAllowedWorkflowUrl(input)).toBe(true);
		});
	});

	describe('rejects', () => {
		it.each([
			['javascript: scheme (XSS)', 'javascript:alert(1)'],
			['data: scheme (XSS/phishing)', 'data:text/html,<script>alert(1)</script>'],
			['file: scheme (local access)', 'file:///etc/passwd'],
			['ftp: scheme', 'ftp://example.com/'],
			['custom scheme', 'n8n://workflow/abc'],
			['protocol-relative URL', '//n8n.example.com/workflow/abc'],
			['relative path', '/workflow/abc'],
			['empty string', ''],
			['whitespace', '   '],
			['plain text', 'not a url'],
		])('%s', (_label, input) => {
			expect(isAllowedWorkflowUrl(input)).toBe(false);
		});

		it.each([
			['undefined', undefined],
			['null', null],
			['number', 123],
			['object', { url: 'https://example.com' }],
			['array', ['https://example.com']],
			['boolean', true],
		])('non-string: %s', (_label, input) => {
			expect(isAllowedWorkflowUrl(input)).toBe(false);
		});
	});

	it('narrows the type to string when true', () => {
		const value: unknown = 'https://n8n.example.com/workflow/abc';
		if (isAllowedWorkflowUrl(value)) {
			// Should type-check without an assertion.
			const upper: string = value.toUpperCase();
			expect(upper).toContain('HTTPS');
		} else {
			throw new Error('Expected URL to be accepted');
		}
	});
});

describe('buildWorkflowDemoUrl', () => {
	it.each([
		[
			'hosted at root',
			'https://n8n.example.com/workflow/abc123',
			'https://n8n.example.com/workflows/demo?hideControls=true&canOpenNDV=false',
		],
		[
			'hosted under a path',
			'https://n8n.example.com/n8n/workflow/abc123',
			'https://n8n.example.com/n8n/workflows/demo?hideControls=true&canOpenNDV=false',
		],
		[
			'clears query and hash',
			'https://n8n.example.com/workflow/abc123?foo=bar#section',
			'https://n8n.example.com/workflows/demo?hideControls=true&canOpenNDV=false',
		],
	])('builds the demo URL for %s', (_label, input, expected) => {
		expect(buildWorkflowDemoUrl(input)).toBe(expected);
	});

	it.each([
		['unexpected path', 'https://n8n.example.com/workflows/abc123'],
		['unsafe URL', 'javascript:alert(1)'],
	])('returns undefined for %s', (_label, input) => {
		expect(buildWorkflowDemoUrl(input)).toBeUndefined();
	});
});

describe('isAllowedWorkflowDemoUrl', () => {
	it.each([
		['root demo URL', 'https://n8n.example.com/workflows/demo?hideControls=true'],
		['base-path demo URL', 'https://n8n.example.com/n8n/workflows/demo'],
	])('accepts %s', (_label, input) => {
		expect(isAllowedWorkflowDemoUrl(input)).toBe(true);
	});

	it.each([
		['workflow URL', 'https://n8n.example.com/workflow/abc123'],
		['unsafe URL', 'javascript:alert(1)'],
	])('rejects %s', (_label, input) => {
		expect(isAllowedWorkflowDemoUrl(input)).toBe(false);
	});
});

describe('resolveWorkflowDemoUrl', () => {
	it('prefers an explicit preview URL', () => {
		expect(
			resolveWorkflowDemoUrl({
				workflowUrl: 'https://workspace.app.n8n.cloud/workflow/abc123',
				previewUrl: 'https://preview.example.com/workflows/demo?hideControls=true',
			}),
		).toBe('https://preview.example.com/workflows/demo?hideControls=true');
	});

	it('ignores an explicit preview URL that is not a demo URL', () => {
		expect(
			resolveWorkflowDemoUrl({
				workflowUrl: 'https://self-hosted.example.com/workflow/abc123',
				previewUrl: 'https://preview.example.com/workflow/abc123',
			}),
		).toBe(
			'https://n8n-preview-service.internal.n8n.cloud/workflows/demo?hideControls=true&canOpenNDV=false',
		);
	});

	it.each([
		['n8n Cloud URL', 'https://workspace.app.n8n.cloud/workflow/abc123'],
		['local URL', 'http://localhost:5678/workflow/abc123'],
		['self-hosted URL', 'https://self-hosted.example.com/workflow/abc123'],
		['unexpected valid path', 'https://self-hosted.example.com/rest/workflows/abc123'],
	])('uses the shared preview service for %s', (_label, workflowUrl) => {
		expect(resolveWorkflowDemoUrl({ workflowUrl })).toBe(
			'https://n8n-preview-service.internal.n8n.cloud/workflows/demo?hideControls=true&canOpenNDV=false',
		);
	});

	it('returns undefined when no safe workflow URL is available', () => {
		expect(resolveWorkflowDemoUrl({ workflowUrl: 'javascript:alert(1)' })).toBeUndefined();
	});
});

describe('applyWorkflowDemoTheme', () => {
	it('adds the theme query parameter', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: 'https://preview.example.com/workflows/demo?hideControls=true',
				theme: 'dark',
			}),
		).toBe(
			'https://preview.example.com/workflows/demo?hideControls=true&canOpenNDV=false&theme=dark',
		);
	});

	it('overrides an existing theme query parameter', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: 'https://preview.example.com/workflows/demo?hideControls=true&theme=light',
				theme: 'dark',
			}),
		).toBe(
			'https://preview.example.com/workflows/demo?hideControls=true&theme=dark&canOpenNDV=false',
		);
	});

	it('removes the theme query parameter when theme is missing', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: 'https://preview.example.com/workflows/demo?hideControls=true&theme=dark',
				theme: undefined,
			}),
		).toBe('https://preview.example.com/workflows/demo?hideControls=true&canOpenNDV=false');
	});

	it('returns undefined when no preview URL is available', () => {
		expect(applyWorkflowDemoTheme({ previewUrl: undefined, theme: 'light' })).toBeUndefined();
	});
});
