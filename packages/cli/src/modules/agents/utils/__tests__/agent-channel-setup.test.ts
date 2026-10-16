import type { AgentIntegrationConfig } from '@n8n/api-types';

import {
	cancelChannelSetup,
	completeChannelSetup,
	getDraftIntegrations,
	prepareChannelSetup,
} from '../agent-channel-setup';

const channel = (credentialId: string): Extract<AgentIntegrationConfig, { type: 'slack' }> => ({
	type: 'slack',
	credentialId,
});

describe('pending destination channels', () => {
	it('keeps setup identity for a repeated request and rejects it after the settings change', () => {
		const incoming = [channel('source'), channel('source')];
		const original = structuredClone(incoming);
		const pending = prepareChannelSetup({ integrations: [] }, incoming);
		const setupId = pending.pendingChannelSetup!.requested[0].setupId!;
		expect(new Set(pending.pendingChannelSetup!.requested.map((entry) => entry.setupId)).size).toBe(
			2,
		);
		expect(pending.integrations).toEqual([]);
		expect(getDraftIntegrations(pending)).toEqual(incoming);
		expect(prepareChannelSetup(pending, incoming)).toEqual(pending);
		expect(incoming).toEqual(original);

		const changed = prepareChannelSetup(pending, [
			{
				...incoming[0],
				settings: { messagingExperience: 'assistant' },
			},
		]);
		expect(() => completeChannelSetup(changed, setupId, channel('new'))).toThrow(
			'Channel setup changed',
		);
	});

	it('completes the selected replacement and cancels another without removing working channels', () => {
		const old = channel('existing');
		const other = channel('other');
		const incoming = channel('incoming');
		const pending = prepareChannelSetup(
			{ integrations: [old, other] },
			[incoming, channel('second')],
			{ requested: incoming, replaces: old },
		);
		const [first, second] = pending.pendingChannelSetup!.requested;
		expect(pending.integrations).toEqual([old, other]);

		const completed = completeChannelSetup(
			pending,
			first.setupId!,
			channel('fresh'),
			first.replaces,
		);
		expect(completed.integrations).toEqual([channel('fresh'), other]);
		expect(completed.pendingChannelSetup!.requested[1].setupId).toBe(second.setupId);
		expect(() =>
			completeChannelSetup(completed, second.setupId!, {
				type: 'linear',
				credentialId: 'fresh',
			}),
		).toThrow('Channel setup changed');

		const canceled = cancelChannelSetup(completed, second.setupId!, 'slack');
		expect(canceled.integrations).toEqual([channel('fresh'), other]);
		expect(canceled.pendingChannelSetup).toBeNull();
	});
});
