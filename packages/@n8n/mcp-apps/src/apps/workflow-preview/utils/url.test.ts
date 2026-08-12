import { describe, expect, it } from 'vitest';

import { isAllowedWorkflowUrl } from './url';

describe('isAllowedWorkflowUrl', () => {
	it.each([
		['https URL', 'https://example.com/workflow/abc'],
		['http URL', 'http://localhost:5678/workflow/abc'],
		['URL with port and query', 'https://n8n.example.com:8443/workflow/abc?foo=bar'],
	])('accepts %s', (_name, url) => {
		expect(isAllowedWorkflowUrl(url)).toBe(true);
	});

	it.each([
		['empty string', ''],
		['non-string', 42],
		['undefined', undefined],
		['null', null],
		['javascript scheme', 'javascript:alert(1)'],
		['data scheme', 'data:text/html,<script>alert(1)</script>'],
		['file scheme', 'file:///etc/passwd'],
		['custom scheme', 'myapp://open'],
		['not a URL', 'not a url'],
		['scheme without host', 'https://'],
	])('rejects %s', (_name, value) => {
		expect(isAllowedWorkflowUrl(value)).toBe(false);
	});
});
