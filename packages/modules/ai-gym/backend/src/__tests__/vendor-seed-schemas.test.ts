import type { Tenant } from '@n8n/ai-gym';
import { describe, expect, it, vi } from 'vitest';

import { applyVendorSeed } from '../vendor-seed-schemas';

function createMockTenant() {
	const seedCalls: Array<{ vendor: string; payload: Record<string, unknown> }> = [];
	const tenant = {
		seed: vi.fn(async (vendor: string, payload: Record<string, unknown>) => {
			seedCalls.push({ vendor, payload });
			return { ok: true };
		}),
	} as unknown as Tenant;
	return { tenant, seedCalls };
}

describe('applyVendorSeed', () => {
	it('applies explicit __structured Slack payloads as individual channel/user/message seed calls', async () => {
		const { tenant, seedCalls } = createMockTenant();
		let seq = 0;

		const actions = await applyVendorSeed({
			tenant,
			vendor: 'slack',
			payload: {
				__structured: true,
				settings: { 'workspace.name': 'Acme Corp' },
				collections: {
					channels: [{ id: 'C01ALERTS01', name: 'alerts' }],
					users: [{ id: 'U01ALICE001', name: 'alice' }],
					messages: [{ channel: 'C01ALERTS01', ts: '1700000001.000100', text: '[SEV1] outage' }],
				},
			},
			nextSeq: () => ++seq,
		});

		expect(actions).toEqual([]);
		expect(seedCalls).toEqual([
			{ vendor: 'slack', payload: { workspace: { name: 'Acme Corp' } } },
			{ vendor: 'slack', payload: { channel: { id: 'C01ALERTS01', name: 'alerts' } } },
			{ vendor: 'slack', payload: { user: { id: 'U01ALICE001', name: 'alice' } } },
			{
				vendor: 'slack',
				payload: {
					message: { channel: 'C01ALERTS01', ts: '1700000001.000100', text: '[SEV1] outage' },
				},
			},
		]);
	});

	it('normalizes flat schema-keyed payloads into structured settings, collections, and API actions', async () => {
		const { tenant, seedCalls } = createMockTenant();
		let seq = 0;

		const slackActions = await applyVendorSeed({
			tenant,
			vendor: 'slack',
			payload: {
				'workspace.name': 'Acme Corp',
				channels: [{ id: 'C01ALERTS01', name: 'alerts' }],
				users: [{ id: 'U01ALICE001', name: 'alice' }],
			},
			nextSeq: () => ++seq,
		});

		expect(slackActions).toEqual([]);
		expect(seedCalls).toEqual([
			{ vendor: 'slack', payload: { workspace: { name: 'Acme Corp' } } },
			{ vendor: 'slack', payload: { channel: { id: 'C01ALERTS01', name: 'alerts' } } },
			{ vendor: 'slack', payload: { user: { id: 'U01ALICE001', name: 'alice' } } },
		]);

		const linearActions = await applyVendorSeed({
			tenant,
			vendor: 'linear',
			payload: {
				workspace_name: 'Acme Engineering',
				issues: [{ title: 'Checkout latency spike', priority: 1 }],
			},
			nextSeq: () => ++seq,
		});

		expect(linearActions).toEqual([
			{
				vendor: 'linear',
				actionId: 'linear.createIssue',
				item: { title: 'Checkout latency spike', priority: 1 },
			},
		]);
	});

	it('passes native single-entity Slack payloads straight through to tenant.seed', async () => {
		const { tenant, seedCalls } = createMockTenant();
		let seq = 0;

		await applyVendorSeed({
			tenant,
			vendor: 'slack',
			payload: {
				channel: { id: 'C01ALERTS01', name: 'alerts' },
				user: { id: 'U01ALICE001', name: 'alice' },
			},
			nextSeq: () => ++seq,
		});

		expect(seedCalls).toEqual([
			{
				vendor: 'slack',
				payload: {
					channel: { id: 'C01ALERTS01', name: 'alerts' },
					user: { id: 'U01ALICE001', name: 'alice' },
				},
			},
		]);
	});
});
