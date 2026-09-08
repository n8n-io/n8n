import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { ResolvedDependency } from '@n8n/api-types';
import { useDependencyMenu } from './useDependencyMenu';

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: vi.fn(() => ({ href: '/mock-href' })) }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const credential = (n: number): ResolvedDependency => ({
	type: 'credentialId',
	id: `cred-${n}`,
	name: `Credential ${n}`,
});

const parent = (n: number): ResolvedDependency => ({
	type: 'workflowParent',
	id: `wf-${n}`,
	name: `Parent ${n}`,
});

describe('useDependencyMenu', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	describe('buildDependencyMenuItems', () => {
		it('should return all entries without a limit', () => {
			const { buildDependencyMenuItems } = useDependencyMenu();
			const deps = [credential(1), ...Array.from({ length: 20 }, (_, i) => parent(i))];

			const items = buildDependencyMenuItems(deps);

			// 2 group headers + 21 entries
			expect(items).toHaveLength(23);
		});

		it('should cap entries at the limit without counting group headers', () => {
			const { buildDependencyMenuItems } = useDependencyMenu();
			const deps = [
				...Array.from({ length: 3 }, (_, i) => credential(i)),
				...Array.from({ length: 20 }, (_, i) => parent(i)),
			];

			const items = buildDependencyMenuItems(deps, { limit: 12 });

			const entries = items.filter((item) => !item.id.startsWith('header-'));
			expect(entries).toHaveLength(12);
			// 3 credentials + 9 parents, plus one header per group
			expect(items).toHaveLength(14);
			expect(entries[11].id).toBe('workflowParent:wf-8');
		});

		it('should not emit a header for a group cut off entirely by the limit', () => {
			const { buildDependencyMenuItems } = useDependencyMenu();
			const deps = [...Array.from({ length: 3 }, (_, i) => credential(i)), parent(1)];

			const items = buildDependencyMenuItems(deps, { limit: 3 });

			expect(items.map((item) => item.id)).toEqual([
				'header-credentialId',
				'credentialId:cred-0',
				'credentialId:cred-1',
				'credentialId:cred-2',
			]);
		});

		it('should apply the limit after the search filter', () => {
			const { buildDependencyMenuItems } = useDependencyMenu();
			const deps = Array.from({ length: 20 }, (_, i) => parent(i));

			const items = buildDependencyMenuItems(deps, { query: 'parent 1', limit: 5 });

			// "Parent 1" and "Parent 10"–"Parent 19" match; the limit keeps 5
			const entries = items.filter((item) => !item.id.startsWith('header-'));
			expect(entries).toHaveLength(5);
		});
	});
});
