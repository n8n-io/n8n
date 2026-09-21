import { describe, expect, it } from 'vitest';

import { NodeRegistry } from '../catalog/node-registry';
import { candidatePrior, retrieveCandidates } from '../catalog/retrieval';

const registry = new NodeRegistry();

describe('retrieveCandidates', () => {
	it('ranks the Slack post operation first for a notification request', () => {
		const candidates = retrieveCandidates(registry, 'send a message to the sales team in Slack', {
			kind: 'action',
		});
		expect(candidates[0]?.operation.id).toBe('slack.message.post');
		expect(candidates.every((candidate) => candidate.operation.kind === 'action')).toBe(true);
	});

	it('finds the webhook trigger for an API request', () => {
		const candidates = retrieveCandidates(registry, 'POST /customers endpoint', {
			kind: 'trigger',
		});
		expect(candidates[0]?.operation.id).toBe('webhook.trigger');
	});

	it('finds the schedule trigger for nightly jobs', () => {
		const candidates = retrieveCandidates(registry, 'reconcile stuck orders every night', {
			kind: 'trigger',
		});
		expect(candidates[0]?.operation.id).toBe('schedule.trigger');
	});

	it('scopes by integration and produces a prior', () => {
		const candidates = retrieveCandidates(registry, 'upsert the customer', {
			integration: 'hubspot',
		});
		expect(candidates.map((candidate) => candidate.operation.integration)).toEqual(
			candidates.map(() => 'hubspot'),
		);
		expect(candidates[0]?.operation.id).toBe('hubspot.contact.upsert');
		const prior = candidatePrior(candidates);
		expect(prior['hubspot.contact.upsert']).toBeGreaterThan(prior['hubspot.contact.get'] ?? 0);
	});

	it('returns nothing for unrelated text', () => {
		expect(retrieveCandidates(registry, 'zzzz qqqq')).toEqual([]);
	});
});

describe('NodeRegistry', () => {
	it('hides operations whose node type is not installed', () => {
		const limited = new NodeRegistry({ installedNodeTypes: new Set(['n8n-nodes-base.webhook']) });
		expect(limited.list().map((operation) => operation.id)).toEqual(['webhook.trigger']);
	});

	it('caches live descriptions per node type and version', async () => {
		let calls = 0;
		const live = new NodeRegistry({
			descriptions: {
				getDescription: async (nodeType, version) => {
					calls += 1;
					return {
						name: nodeType,
						displayName: nodeType,
						description: '',
						group: [],
						version: version ?? 1,
						properties: [],
						inputs: [],
						outputs: [],
					};
				},
			},
		});
		await live.describe('n8n-nodes-base.slack', 2.2);
		await live.describe('n8n-nodes-base.slack', 2.2);
		expect(calls).toBe(1);
	});
});
