import type { DocPageSummary } from '@n8n/api-types';
import { detectDocPageKind, groupByKind } from './docPages.utils';

const isTrigger = (type: string) => type.endsWith('Trigger');

describe('detectDocPageKind', () => {
	it.each([
		[['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.webhook'], 'api'],
		[['n8n-nodes-base.formTrigger'], 'api'],
		[['@n8n/n8n-nodes-langchain.chatTrigger', 'n8n-nodes-base.cron'], 'agent'],
		[['n8n-nodes-base.cron'], 'schedule'],
		[['n8n-nodes-base.slackTrigger', 'n8n-nodes-base.set'], 'event'],
		[['n8n-nodes-base.manualTrigger', 'n8n-nodes-base.executeWorkflowTrigger'], null],
		[[], null],
	])('returns the kind for %j', (nodeTypes, expected) => {
		expect(detectDocPageKind(nodeTypes, isTrigger)).toBe(expected);
	});
});

describe('groupByKind', () => {
	const item = (name: string, kind: DocPageSummary['kind']): DocPageSummary => ({
		id: null,
		resourceType: 'workflow',
		resourceId: name,
		projectId: 'p1',
		name,
		kind,
		excerpt: '',
		isStale: false,
		isPublished: true,
	});

	it('groups in the fixed kind order, sorts by name and drops empty groups', () => {
		const groups = groupByKind([
			item('Zeta', 'agent'),
			item('Beta', 'api'),
			item('Alpha', 'api'),
			item('Nightly', 'schedule'),
		]);

		expect(groups.map((g) => g.kind)).toEqual(['api', 'schedule', 'agent']);
		expect(groups[0].items.map((i) => i.name)).toEqual(['Alpha', 'Beta']);
	});
});
