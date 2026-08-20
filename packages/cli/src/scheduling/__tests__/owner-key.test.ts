import { ownerKeyFor, withOwnerKeys } from '../owner-key';

const key = (workflowId: string, nodeId: string) => `${workflowId}\0${nodeId}`;

describe('ownerKeyFor', () => {
	it.each([
		['both ids present', 'wf-1', 'node-1', key('wf-1', 'node-1')],
		['workflowId is null', null, 'node-1', null],
		['nodeId is null', 'wf-1', null, null],
		['both are null', null, null, null],
	])('%s', (_case, workflowId, nodeId, expected) => {
		expect(ownerKeyFor({ workflowId, nodeId })).toBe(expected);
	});

	it('distinguishes owners whose ids differ only in where the boundary falls', () => {
		expect(ownerKeyFor({ workflowId: 'wf-1:node', nodeId: '1' })).not.toBe(
			ownerKeyFor({ workflowId: 'wf-1', nodeId: 'node:1' }),
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
			{ id: 1, workflowId: 'wf-1', nodeId: 'node-1', ownerKey: key('wf-1', 'node-1') },
			{ id: 2, workflowId: 'wf-1', nodeId: 'node-1', ownerKey: key('wf-1', 'node-1') },
			{ id: 3, workflowId: 'wf-2', nodeId: 'node-9', ownerKey: key('wf-2', 'node-9') },
			{ id: 4, workflowId: null, nodeId: null, ownerKey: null },
		]);
	});
});
