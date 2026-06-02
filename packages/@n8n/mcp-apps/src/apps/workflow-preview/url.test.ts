import { describe, expect, it } from 'vitest';

import { isAllowedWorkflowUrl } from './url';

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
