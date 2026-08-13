import { describe, expect, it } from 'vitest';

import {
	applyWorkflowDemoTheme,
	isAllowedWorkflowDemoUrl,
	isAllowedWorkflowUrl,
	resolveWorkflowDemoUrl,
} from './url';
import { WORKFLOW_PREVIEW_ORIGIN } from '../../../server/constants';

const DEFAULT_WORKFLOW_DEMO_URL = `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&canOpenNDV=false&canvasBackground=dots`;

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

describe('isAllowedWorkflowDemoUrl', () => {
	it.each([
		['root demo URL', `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true`],
		['base-path demo URL', `${WORKFLOW_PREVIEW_ORIGIN}/n8n/workflows/demo`],
	])('accepts fixed preview service %s', (_label, input) => {
		expect(isAllowedWorkflowDemoUrl(input)).toBe(true);
	});

	it('accepts a demo URL from the workflow URL origin', () => {
		expect(
			isAllowedWorkflowDemoUrl(
				'https://n8n.example.com/workflows/demo?hideControls=true',
				'https://n8n.example.com/workflow/abc123',
			),
		).toBe(true);
	});

	it.each([
		['workflow URL', 'https://n8n.example.com/workflow/abc123'],
		['untrusted demo URL', 'https://preview.example.com/workflows/demo?hideControls=true'],
		['unsafe URL', 'javascript:alert(1)'],
	])('rejects %s', (_label, input) => {
		expect(isAllowedWorkflowDemoUrl(input)).toBe(false);
	});
});

describe('resolveWorkflowDemoUrl', () => {
	it('prefers an explicit fixed-service preview URL', () => {
		expect(
			resolveWorkflowDemoUrl({
				workflowUrl: 'https://workspace.app.n8n.cloud/workflow/abc123',
				previewUrl: `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true`,
			}),
		).toBe(`${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true`);
	});

	it('prefers an explicit preview URL from the workflow URL origin', () => {
		expect(
			resolveWorkflowDemoUrl({
				workflowUrl: 'https://workspace.app.n8n.cloud/workflow/abc123',
				previewUrl: 'https://workspace.app.n8n.cloud/workflows/demo?hideControls=true',
			}),
		).toBe('https://workspace.app.n8n.cloud/workflows/demo?hideControls=true');
	});

	it('ignores an explicit preview URL from an untrusted origin', () => {
		expect(
			resolveWorkflowDemoUrl({
				workflowUrl: 'https://workspace.app.n8n.cloud/workflow/abc123',
				previewUrl: 'https://preview.example.com/workflows/demo?hideControls=true',
			}),
		).toBe(DEFAULT_WORKFLOW_DEMO_URL);
	});

	it('ignores an explicit preview URL that is not a demo URL', () => {
		expect(
			resolveWorkflowDemoUrl({
				workflowUrl: 'https://self-hosted.example.com/workflow/abc123',
				previewUrl: 'https://preview.example.com/workflow/abc123',
			}),
		).toBe(DEFAULT_WORKFLOW_DEMO_URL);
	});

	it.each([
		['n8n Cloud URL', 'https://workspace.app.n8n.cloud/workflow/abc123'],
		['local URL', 'http://localhost:5678/workflow/abc123'],
		['self-hosted URL', 'https://self-hosted.example.com/workflow/abc123'],
		['unexpected valid path', 'https://self-hosted.example.com/rest/workflows/abc123'],
	])('uses the shared preview service for %s', (_label, workflowUrl) => {
		expect(resolveWorkflowDemoUrl({ workflowUrl })).toBe(DEFAULT_WORKFLOW_DEMO_URL);
	});

	it('returns undefined when no safe workflow URL is available', () => {
		expect(resolveWorkflowDemoUrl({ workflowUrl: 'javascript:alert(1)' })).toBeUndefined();
	});
});

describe('applyWorkflowDemoTheme', () => {
	it('adds the theme query parameter', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true`,
				theme: 'dark',
			}),
		).toBe(
			`${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&canOpenNDV=false&canvasBackground=dots&theme=dark`,
		);
	});

	it('overrides an existing theme query parameter', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&theme=light`,
				theme: 'dark',
			}),
		).toBe(
			`${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&theme=dark&canOpenNDV=false&canvasBackground=dots`,
		);
	});

	it('removes the theme query parameter when theme is missing', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&theme=dark`,
				theme: undefined,
			}),
		).toBe(
			`${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&canOpenNDV=false&canvasBackground=dots`,
		);
	});

	it('returns undefined when no preview URL is available', () => {
		expect(applyWorkflowDemoTheme({ previewUrl: undefined, theme: 'light' })).toBeUndefined();
	});

	it('adds the theme query parameter for a workflow-origin preview URL', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: 'https://n8n.example.com/workflows/demo?hideControls=true',
				workflowUrl: 'https://n8n.example.com/workflow/abc123',
				theme: 'light',
			}),
		).toBe(
			'https://n8n.example.com/workflows/demo?hideControls=true&canOpenNDV=false&canvasBackground=dots&theme=light',
		);
	});

	it('returns undefined for an untrusted preview URL', () => {
		expect(
			applyWorkflowDemoTheme({
				previewUrl: 'https://preview.example.com/workflows/demo?hideControls=true',
				workflowUrl: 'https://n8n.example.com/workflow/abc123',
				theme: 'light',
			}),
		).toBeUndefined();
	});
});
