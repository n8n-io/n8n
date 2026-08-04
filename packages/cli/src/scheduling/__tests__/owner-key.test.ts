import { ownerKeyFor, withOwnerKeys } from '../owner-key';

describe('ownerKeyFor', () => {
	it('joins workflowId and nodeId when both are present', () => {
		expect(ownerKeyFor({ workflowId: 'wf-1', nodeId: 'node-1' })).toBe('wf-1:node-1');
	});

	it('returns null when workflowId is null', () => {
		expect(ownerKeyFor({ workflowId: null, nodeId: 'node-1' })).toBeNull();
	});

	it('returns null when nodeId is null', () => {
		expect(ownerKeyFor({ workflowId: 'wf-1', nodeId: null })).toBeNull();
	});

	it('returns null when both are null', () => {
		expect(ownerKeyFor({ workflowId: null, nodeId: null })).toBeNull();
	});

	it('gives the rules of one node the same key regardless of their order', () => {
		const rules = [
			{ workflowId: 'wf-1', nodeId: 'node-1', name: 'wf-1:node-1:2:aaa' },
			{ workflowId: 'wf-1', nodeId: 'node-1', name: 'wf-1:node-1:0:bbb' },
			{ workflowId: 'wf-1', nodeId: 'node-1', name: 'wf-1:node-1:1:ccc' },
		];

		const keys = rules.map(ownerKeyFor);
		const reversedKeys = [...rules].reverse().map(ownerKeyFor);

		expect(new Set(keys)).toEqual(new Set(['wf-1:node-1']));
		expect(new Set(reversedKeys)).toEqual(new Set(['wf-1:node-1']));
	});

	it('distinguishes different nodes of the same workflow', () => {
		expect(ownerKeyFor({ workflowId: 'wf-1', nodeId: 'node-1' })).not.toBe(
			ownerKeyFor({ workflowId: 'wf-1', nodeId: 'node-2' }),
		);
	});

	it('does not derive the key from the job name', () => {
		const first = { workflowId: 'wf-1', nodeId: 'node-1', name: 'wf-1:node-1:0:fingerprint-a' };
		const second = { workflowId: 'wf-1', nodeId: 'node-1', name: 'wf-1:node-1:1:fingerprint-b' };

		expect(ownerKeyFor(first)).toBe(ownerKeyFor(second));
		expect(ownerKeyFor(first)).not.toBe(first.name);
		expect(ownerKeyFor(first)).not.toContain('fingerprint-a');
	});
});

describe('withOwnerKeys', () => {
	it('stamps each job with its owner key, keeping the claim clock', () => {
		const now = new Date('2026-01-01T00:00:00.000Z');

		const result = withOwnerKeys({
			now,
			jobs: [
				{ id: 1, workflowId: 'wf-1', nodeId: 'node-1' },
				{ id: 2, workflowId: 'wf-1', nodeId: 'node-1' },
				{ id: 3, workflowId: 'wf-2', nodeId: 'node-9' },
				{ id: 4, workflowId: null, nodeId: null },
			],
		});

		expect(result.now).toBe(now);
		expect(result.jobs).toEqual([
			{ id: 1, workflowId: 'wf-1', nodeId: 'node-1', ownerKey: 'wf-1:node-1' },
			{ id: 2, workflowId: 'wf-1', nodeId: 'node-1', ownerKey: 'wf-1:node-1' },
			{ id: 3, workflowId: 'wf-2', nodeId: 'node-9', ownerKey: 'wf-2:node-9' },
			{ id: 4, workflowId: null, nodeId: null, ownerKey: null },
		]);
	});
});
