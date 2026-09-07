import { computeWorkspaceContentHash } from '../compute-workspace-content-hash';

describe('computeWorkspaceContentHash', () => {
	it('returns a stable hash regardless of insertion order', () => {
		const a = new Map([
			['/workspace/a.txt', 'alpha'],
			['/workspace/b.txt', 'beta'],
		]);
		const b = new Map([
			['/workspace/b.txt', 'beta'],
			['/workspace/a.txt', 'alpha'],
		]);

		expect(computeWorkspaceContentHash(a)).toBe(computeWorkspaceContentHash(b));
		expect(computeWorkspaceContentHash(a)).toMatch(/^[a-f0-9]{12}$/);
	});

	it('changes when file content changes', () => {
		const original = new Map([['/workspace/a.txt', 'alpha']]);
		const updated = new Map([['/workspace/a.txt', 'beta']]);

		expect(computeWorkspaceContentHash(original)).not.toBe(computeWorkspaceContentHash(updated));
	});
});
