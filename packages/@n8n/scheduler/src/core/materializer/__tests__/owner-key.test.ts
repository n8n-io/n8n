import { ownerKeyFor, withOwnerKeys } from '../owner-key';

const owner = (ownerType: string, ownerId: string, ownerMemberId: string | null = null) => ({
	ownerType,
	ownerId,
	ownerMemberId,
});

describe('ownerKeyFor', () => {
	it("groups a trigger node's rules under one key", () => {
		const node = owner('workflow', 'wf-1', 'node-1');

		expect(ownerKeyFor(node)).toBe('8:workflow4:wf-16:node-1');
		expect(ownerKeyFor({ ...node })).toBe(ownerKeyFor(node));
	});

	it('gives a member-less owner its own key, so self-owned jobs never group together', () => {
		const first = owner('system-task', 'system:prune-executions');
		const second = owner('system-task', 'system:reconcile-owners');

		expect(ownerKeyFor(first)).toBe('11:system-task23:system:prune-executions-:');
		expect(ownerKeyFor(first)).not.toBe(ownerKeyFor(second));
	});

	it('separates the same ids under different owner types', () => {
		expect(ownerKeyFor(owner('workflow', 'id-1'))).not.toBe(ownerKeyFor(owner('agent', 'id-1')));
	});

	it('distinguishes owners whose parts differ only in where the boundary falls', () => {
		expect(ownerKeyFor(owner('workflow', 'wf-1:node', '1'))).not.toBe(
			ownerKeyFor(owner('workflow', 'wf-1', 'node:1')),
		);
		expect(ownerKeyFor(owner('workflow', 'wf-1', 'node-1'))).not.toBe(
			ownerKeyFor(owner('workflow', 'wf-1', null)),
		);
		expect(ownerKeyFor(owner('workflow', 'wf-1', ''))).not.toBe(
			ownerKeyFor(owner('workflow', 'wf-1', null)),
		);
	});

	it('keeps the parts apart whatever they carry, separators and markers included', () => {
		// A member id spelling the missing-member marker, and a part carrying the
		// separator: neither may forge the boundary the length prefix pins.
		expect(ownerKeyFor(owner('workflow', 'wf-1', '-'))).not.toBe(
			ownerKeyFor(owner('workflow', 'wf-1', null)),
		);
		expect(ownerKeyFor(owner('workflow', 'wf-1:node', '1'))).not.toBe(
			ownerKeyFor(owner('workflow', 'wf-1', 'node:1')),
		);
	});

	it('does not derive the key from the job name', () => {
		const first = { ...owner('workflow', 'wf-1', 'node-1'), name: 'wf-1:node-1:fingerprint-a:0' };
		const second = { ...owner('workflow', 'wf-1', 'node-1'), name: 'wf-1:node-1:fingerprint-b:0' };

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
				{ id: 1, ...owner('workflow', 'wf-1', 'node-1') },
				{ id: 2, ...owner('workflow', 'wf-1', 'node-1') },
				{ id: 3, ...owner('workflow', 'wf-2', 'node-9') },
				{ id: 4, ...owner('system-task', 'system:prune-executions') },
			],
		});

		expect(result.now).toBe(now);
		expect(result.jobs).toEqual([
			{
				id: 1,
				...owner('workflow', 'wf-1', 'node-1'),
				ownerKey: '8:workflow4:wf-16:node-1',
			},
			{
				id: 2,
				...owner('workflow', 'wf-1', 'node-1'),
				ownerKey: '8:workflow4:wf-16:node-1',
			},
			{
				id: 3,
				...owner('workflow', 'wf-2', 'node-9'),
				ownerKey: '8:workflow4:wf-26:node-9',
			},
			{
				id: 4,
				...owner('system-task', 'system:prune-executions'),
				ownerKey: '11:system-task23:system:prune-executions-:',
			},
		]);
	});
});
