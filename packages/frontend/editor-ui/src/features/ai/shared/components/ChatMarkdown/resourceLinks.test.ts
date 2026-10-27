import { describe, expect, it } from 'vitest';
import { getResourceLinkIcon } from './resourceLinks';

describe('getResourceLinkIcon', () => {
	it.each([
		['https://n8n.io/workflow/123', 'workflow'],
		['https://n8n.io/project/123/workflow/456', 'workflow'],
		['https://n8n.io/agents/abc', 'bot'],
		['https://n8n.io/assistant/890', 'message-circle'],
	])('matches resource links on the site: %s', (href, icon) => {
		expect(getResourceLinkIcon(href, 'https://n8n.io')).toBe(icon);
	});

	it.each([
		'https://www.google.com/workflow',
		'https://n8n.io/settings',
		'https://n8n.io/workflow-copy',
		'https://n8n.io/project/123/my-agents/456',
		'https://n8n.io.evil.example/workflow/123',
		'ftp://n8n.io/workflow/123',
		'javascript:alert(1)',
	])('leaves other links unchanged: %s', (href) => {
		expect(getResourceLinkIcon(href, 'https://n8n.io')).toBeUndefined();
	});

	it.each([
		['/workflow/123?tab=editor#node', 'workflow'],
		['/project/123/workflow/456', 'workflow'],
		['/agents/abc', 'bot'],
		['/assistant/890', 'message-circle'],
	])('matches relative resource links: %s', (href, icon) => {
		expect(getResourceLinkIcon(href, 'https://n8n.io')).toBe(icon);
	});

	it('matches the local backend when the editor uses a different port', () => {
		expect(
			getResourceLinkIcon(
				'http://localhost:5678/workflow/JNtOPQ1lpCVznf9F',
				'http://localhost:8080',
			),
		).toBe('workflow');
	});
});
