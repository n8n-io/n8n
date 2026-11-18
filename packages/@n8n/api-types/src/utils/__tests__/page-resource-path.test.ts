import {
	extractResourceReferences,
	parseResourcePath,
	toResourcePath,
} from '../page-resource-path';

describe('parseResourcePath', () => {
	it.each([
		['/workflow/wf1', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1/', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1?tab=a#top', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1/executions', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1/executions/42', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1/history/v2', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1/debug/42', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1/evaluation', { resourceType: 'workflow', resourceId: 'wf1' }],
		['/workflow/wf1/node1', { resourceType: 'node', resourceId: 'node1', workflowId: 'wf1' }],
		['/page/p1', { resourceType: 'page', resourceId: 'p1' }],
		['/projects/proj1/pages/p1', { resourceType: 'page', resourceId: 'p1' }],
		['/projects/proj1/credentials/c1', { resourceType: 'credential', resourceId: 'c1' }],
		['/home/credentials/c1', { resourceType: 'credential', resourceId: 'c1' }],
		['/projects/proj1/datatables/dt1', { resourceType: 'dataTable', resourceId: 'dt1' }],
	])('should read %s', (path, reference) => {
		expect(parseResourcePath(path)).toEqual(reference);
	});

	it.each([
		'/workflow/new',
		'/workflow',
		'/projects/proj1/datatables/new',
		'/projects/proj1/pages',
		'/projects/proj1',
		'/settings/users',
		'https://example.com/workflow/wf1',
		'workflow/wf1',
		'',
	])('should not read "%s"', (path) => {
		expect(parseResourcePath(path)).toBeUndefined();
	});
});

describe('toResourcePath', () => {
	it.each([
		[{ resourceType: 'workflow', resourceId: 'wf1' } as const],
		[{ resourceType: 'node', resourceId: 'node1', workflowId: 'wf1' } as const],
		[{ resourceType: 'page', resourceId: 'p1' } as const],
		[{ resourceType: 'credential', resourceId: 'c1' } as const],
		[{ resourceType: 'dataTable', resourceId: 'dt1' } as const],
	])('should build a path that parseResourcePath reads back for %o', (reference) => {
		const path = toResourcePath({ ...reference, projectId: 'proj1' });

		expect(parseResourcePath(path)).toEqual(reference);
	});

	it('should open a credential from the home view when it has no project', () => {
		expect(toResourcePath({ resourceType: 'credential', resourceId: 'c1' })).toBe(
			'/home/credentials/c1',
		);
	});
});

describe('extractResourceReferences', () => {
	it('should list each linked resource once', () => {
		const markdown = [
			'# Runbook',
			'See [Sync orders](/workflow/wf1) and [its trigger](/workflow/wf1/node1).',
			'Again [Sync orders](/workflow/wf1/executions).',
			'Uses [the key](/projects/proj1/credentials/c1 "API key") and [orders](</projects/proj1/datatables/dt1>).',
			'Related: [Other page](/page/p2).',
		].join('\n');

		expect(extractResourceReferences(markdown)).toEqual([
			{ resourceType: 'workflow', resourceId: 'wf1' },
			{ resourceType: 'node', resourceId: 'node1', workflowId: 'wf1' },
			{ resourceType: 'credential', resourceId: 'c1' },
			{ resourceType: 'dataTable', resourceId: 'dt1' },
			{ resourceType: 'page', resourceId: 'p2' },
		]);
	});

	it('should ignore links that open no n8n resource', () => {
		const markdown =
			'[docs](https://docs.n8n.io) [other host](https://example.com/workflow/wf1) [settings](/settings)';

		expect(extractResourceReferences(markdown)).toEqual([]);
	});
});
