import { buildMemoryEntrySource } from '../memory-entry-source';

const names = new Map([['u1', 'Ada']]);

describe('buildMemoryEntrySource', () => {
	it('shows a Slack channel with the author', () => {
		const source = buildMemoryEntrySource(
			'integration:slack:U1',
			{
				author: { id: 'U1', name: 'Sin' },
				origin: {
					source: 'slack',
					integration: {
						type: 'slack',
						workspaceId: 'W1',
						conversationKind: 'channel',
						channelId: 'C1',
						channelName: 'finance-ops',
					},
				},
			},
			names,
			'viewer',
		);

		expect(source).toEqual({ kind: 'slack', userName: 'Sin', place: '#finance-ops' });
	});

	it('shows a single # when the stored Slack channel name already has one', () => {
		const source = buildMemoryEntrySource(
			'integration:slack:U1',
			{
				origin: {
					source: 'slack',
					integration: {
						type: 'slack',
						workspaceId: 'W1',
						conversationKind: 'channel',
						channelId: 'C1',
						channelName: '#secret-agents',
					},
				},
			},
			names,
			'viewer',
		);

		expect(source).toEqual({ kind: 'slack', place: '#secret-agents' });
	});

	it('marks a Slack direct message', () => {
		const source = buildMemoryEntrySource(
			'integration:slack:U1',
			{
				origin: {
					source: 'slack',
					integration: {
						type: 'slack',
						workspaceId: 'W1',
						conversationKind: 'dm',
						channelId: 'D1',
					},
				},
			},
			names,
			'viewer',
		);

		expect(source).toEqual({ kind: 'slack', isDirectMessage: true });
	});

	it('shows the Linear issue identifier', () => {
		const source = buildMemoryEntrySource(
			'integration:linear:L1',
			{
				author: { id: 'L1', name: 'Priya' },
				origin: {
					source: 'linear',
					integration: { type: 'linear', issueId: 'i1', identifier: 'ENG-123', title: 'Secret' },
				},
			},
			names,
			'viewer',
		);

		expect(source).toEqual({ kind: 'linear', userName: 'Priya', place: 'ENG-123' });
	});

	it('shows only the author for other integrations', () => {
		const source = buildMemoryEntrySource(
			'integration:discord:D1',
			{
				author: { id: 'D1', name: 'Marco' },
				origin: {
					source: 'discord',
					integration: { type: 'discord', channelId: 'C1', channelName: 'general' },
				},
			},
			names,
			'viewer',
		);

		expect(source).toEqual({ kind: 'discord', userName: 'Marco' });
	});

	it('falls back to the integration in the resource id when the message is gone', () => {
		expect(buildMemoryEntrySource('integration:telegram:T1', {}, names, 'viewer')).toEqual({
			kind: 'telegram',
		});
	});

	it.each([
		['preview', 'draft-chat:u1'],
		['n8n-chat', 'n8n-chat-production:u1'],
		['build', 'system-chat:u1'],
	])('resolves the %s owner from the resource id', (kind, resourceId) => {
		expect(buildMemoryEntrySource(resourceId, {}, names, 'viewer')).toEqual({
			kind,
			userName: 'Ada',
		});
	});

	it('marks the viewer on their own chat', () => {
		expect(buildMemoryEntrySource('draft-chat:u1', {}, names, 'u1')).toEqual({
			kind: 'preview',
			userName: 'Ada',
			isViewer: true,
		});
	});

	it('returns nothing for an unknown resource', () => {
		expect(buildMemoryEntrySource('task:t1', {}, names, 'viewer')).toBeUndefined();
	});
});
