import { BadRequestError } from '@n8n/errors';

import type { MemorySourceFacetRow } from '../../repositories/agent-memory-entry.repository';
import { buildMemorySourceFacetGroups, toMemoryEntrySourceFilter } from '../memory-source-filter';

function row(resourceId: string, fields: Partial<MemorySourceFacetRow> = {}): MemorySourceFacetRow {
	return {
		resourceId,
		integrationType: null,
		channelId: null,
		channelName: null,
		teamId: null,
		teamName: null,
		authorId: null,
		authorName: null,
		...fields,
	};
}

describe('toMemoryEntrySourceFilter', () => {
	it.each([
		[{}, {}],
		[
			{ source: 'slack' },
			{ integration: { type: 'slack', resourceIdPrefixes: ['integration:slack:', 'slack:'] } },
		],
		[{ source: 'preview' }, { resourceIdPrefix: 'draft-chat:' }],
		[
			{ source: 'build', sourceFacet: 'user', sourceFacetId: 'u1' },
			{ resourceId: 'system-chat:u1' },
		],
		[
			{ source: 'linear', sourceFacet: 'team', sourceFacetId: 'T1' },
			{ sourceMessage: { integrationType: 'linear', field: 'teamId', value: 'T1' } },
		],
		[
			{ source: 'telegram', sourceFacet: 'user', sourceFacetId: '42' },
			{ sourceMessage: { integrationType: 'telegram', field: 'authorId', value: '42' } },
		],
	] as const)('maps %j', (selection, filter) => {
		expect(toMemoryEntrySourceFilter(selection)).toEqual(filter);
	});

	it.each([
		{ sourceFacet: 'user', sourceFacetId: 'u1' },
		{ source: 'slack', sourceFacet: 'channel' },
		{ source: 'slack', sourceFacet: 'team', sourceFacetId: 'T1' },
		{ source: 'preview', sourceFacet: 'channel', sourceFacetId: 'C1' },
	] as const)('rejects %j', (selection) => {
		expect(() => toMemoryEntrySourceFilter(selection)).toThrow(BadRequestError);
	});
});

describe('buildMemorySourceFacetGroups', () => {
	it('groups integration authors and places by scope format, and chat owners', () => {
		const slackContext = {
			integrationType: 'slack',
			channelId: 'C1',
			authorId: 'U1',
			authorName: 'Sin',
		};
		const groups = buildMemorySourceFacetGroups(
			[
				row('slack:agent-1:W1:channel:C1', slackContext),
				row('slack:agent-1:W1:channel:C1', { ...slackContext, channelName: '#finance-ops' }),
				// An older entry whose message has no author or origin.
				row('integration:slack:U9'),
				row('linear:agent-1:credential-1:T1', {
					integrationType: 'linear',
					teamId: 'T1',
					teamName: 'Platform',
				}),
				row('draft-chat:viewer-1'),
				row('n8n-chat-production:other'),
				row('task:run-1'),
			],
			new Map([['viewer-1', 'Robin B']]),
			'viewer-1',
		);

		expect(groups).toEqual([
			{
				kind: 'slack',
				users: [{ id: 'U1', name: 'Sin' }],
				channels: [{ id: 'C1', name: 'finance-ops' }],
			},
			{ kind: 'linear', users: [], teams: [{ id: 'T1', name: 'Platform' }] },
			{ kind: 'preview', users: [{ id: 'viewer-1', name: 'Robin B', isViewer: true }] },
			{ kind: 'n8n-chat', users: [{ id: 'other' }] },
		]);
	});
});
