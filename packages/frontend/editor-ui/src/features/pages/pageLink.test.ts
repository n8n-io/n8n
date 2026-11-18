import {
	readLinkedPageId,
	toPageLink,
	toResourceMarkdownLink,
	toWorkflowMarkdownLink,
} from './pageLink';

const instance = { origin: 'https://n8n.example.com', basePath: '/' };

describe('readLinkedPageId', () => {
	it.each([
		['a short path', '/page/abc123'],
		['a project path', '/projects/p1/pages/abc123'],
		['an absolute URL of this instance', 'https://n8n.example.com/page/abc123'],
		['a path with surrounding whitespace', '  /page/abc123\n'],
		['a path with a query and a hash', '/page/abc123?from=canvas#top'],
		['a markdown link to a path', '[Runbook](/page/abc123)'],
		['a markdown link to an absolute URL', '[Runbook](https://n8n.example.com/page/abc123)'],
		['a markdown link with an empty text', '[](/page/abc123)'],
	])('should read the page id from %s', (_, content) => {
		expect(readLinkedPageId(content, instance)).toBe('abc123');
	});

	it.each([
		['an empty text', ''],
		['plain text', "I'm a note"],
		['a path followed by text', '/page/abc123 is the runbook'],
		['an absolute URL followed by text', 'https://n8n.example.com/page/abc123 runbook'],
		['text followed by a markdown link', 'See [Runbook](/page/abc123)'],
		['two markdown links', '[A](/page/abc123) [B](/page/def456)'],
		['a URL of another origin', 'https://other.example.com/page/abc123'],
		['a link to a workflow', '/workflow/abc123'],
		['a markdown link to a workflow', '[Workflow](/workflow/abc123)'],
		['the pages list of a project', '/projects/p1/pages'],
	])('should read no page id from %s', (_, content) => {
		expect(readLinkedPageId(content, instance)).toBeUndefined();
	});

	it('should read the page id from an absolute URL under the base path', () => {
		const underBasePath = { origin: 'https://example.com', basePath: '/n8n/' };

		expect(readLinkedPageId('https://example.com/n8n/page/abc123', underBasePath)).toBe('abc123');
		expect(readLinkedPageId('https://example.com/page/abc123', underBasePath)).toBeUndefined();
	});
});

describe('toPageLink', () => {
	it('should build a link that readLinkedPageId reads back', () => {
		expect(toPageLink('abc123')).toBe('/page/abc123');
		expect(readLinkedPageId(toPageLink('abc123'), instance)).toBe('abc123');
	});
});

describe('toWorkflowMarkdownLink', () => {
	it('should link to the workflow', () => {
		expect(toWorkflowMarkdownLink({ id: 'w1', name: 'Sync orders' })).toBe(
			'[Sync orders](/workflow/w1)',
		);
	});

	it('should escape brackets in the workflow name', () => {
		expect(toWorkflowMarkdownLink({ id: 'w1', name: 'Sync [prod]' })).toBe(
			'[Sync \\[prod\\]](/workflow/w1)',
		);
	});
});

describe('toResourceMarkdownLink', () => {
	it.each([
		[{ resourceType: 'workflow', resourceId: 'w1' } as const, '/workflow/w1'],
		[{ resourceType: 'node', resourceId: 'n1', workflowId: 'w1' } as const, '/workflow/w1/n1'],
		[
			{ resourceType: 'credential', resourceId: 'c1', projectId: 'p1' } as const,
			'/projects/p1/credentials/c1',
		],
		[
			{ resourceType: 'dataTable', resourceId: 'd1', projectId: 'p1' } as const,
			'/projects/p1/datatables/d1',
		],
	])('should link to the path of $resourceType', (resource, path) => {
		expect(toResourceMarkdownLink(resource, 'Name')).toBe(`[Name](${path})`);
	});

	it('should escape the brackets of the name', () => {
		expect(toResourceMarkdownLink({ resourceType: 'workflow', resourceId: 'w1' }, 'A [b]')).toBe(
			'[A \\[b\\]](/workflow/w1)',
		);
	});
});
