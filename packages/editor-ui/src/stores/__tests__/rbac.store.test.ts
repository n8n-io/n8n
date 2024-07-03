import { createPinia, setActivePinia } from 'pinia';
import { useRBACStore } from '@/stores/rbac.store';
import type { Scope } from '@n8n/permissions';
import { hasScope } from '@n8n/permissions';

vi.mock('@n8n/permissions', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const { hasScope } = await vi.importActual<typeof import('@n8n/permissions')>('@n8n/permissions');
	return {
		hasScope: vi.fn().mockImplementation(hasScope),
	};
});

describe('RBAC store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('addGlobalScope()', () => {
		it('should add global scope', () => {
			const newScope = 'example:list' as Scope;
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope(newScope);
			expect(rbacStore.globalScopes).toContain(newScope);
		});

		it('should not add global scope if it already exists', () => {
			const newScope = 'example:list' as Scope;
			const rbacStore = useRBACStore();
			rbacStore.addGlobalScope(newScope);
			rbacStore.addGlobalScope(newScope);
			expect(rbacStore.globalScopes.filter((scope) => scope === newScope)).toHaveLength(1);
		});
	});

	describe('addProjectScope()', () => {
		it('should add project scope', () => {
			const newScope = 'example:list' as Scope;
			const rbacStore = useRBACStore();
			rbacStore.addProjectScope(newScope, { projectId: '1' });
			expect(rbacStore.scopesByProjectId['1']).toContain(newScope);
		});

		it('should not add project scope if it already exists', () => {
			const newScope = 'example:list' as Scope;
			const rbacStore = useRBACStore();
			rbacStore.addProjectScope(newScope, { projectId: '1' });
			rbacStore.addProjectScope(newScope, { projectId: '1' });
			expect(rbacStore.scopesByProjectId['1'].filter((scope) => scope === newScope)).toHaveLength(
				1,
			);
		});
	});

	describe('addResourceScope()', () => {
		it('should add resource scope', () => {
			const newScope = 'example:list' as Scope;
			const rbacStore = useRBACStore();
			rbacStore.addResourceScope(newScope, { resourceId: '1', resourceType: 'variable' });
			expect(rbacStore.scopesByResourceId.variable['1']).toContain(newScope);
		});

		it('should not add resource scope if it already exists', () => {
			const newScope = 'example:list' as Scope;
			const rbacStore = useRBACStore();
			rbacStore.addResourceScope(newScope, { resourceId: '1', resourceType: 'variable' });
			rbacStore.addResourceScope(newScope, { resourceId: '1', resourceType: 'variable' });
			expect(
				rbacStore.scopesByResourceId.variable['1'].filter((scope) => scope === newScope),
			).toHaveLength(1);
		});
	});

	describe('hasScope()', () => {
		it('evaluates global scope correctly', () => {
			const newScope = 'example:list' as Scope;
			const store = useRBACStore();
			store.addGlobalScope(newScope);

			const result = store.hasScope(newScope, {});
			expect(result).toBe(true);
			expect(vi.mocked(hasScope)).toHaveBeenCalledWith(
				newScope,
				{
					global: expect.arrayContaining([newScope]),
					project: [],
					resource: [],
				},
				undefined,
				undefined,
			);
		});

		it('evaluates project scope correctly', () => {
			const newScope = 'example:list' as Scope;
			const store = useRBACStore();
			store.addProjectScope(newScope, { projectId: '1' });

			const result = store.hasScope(newScope, { projectId: '1' });
			expect(result).toBe(true);
			expect(vi.mocked(hasScope)).toHaveBeenCalledWith(
				newScope,
				{
					global: expect.any(Array),
					project: expect.arrayContaining([newScope]),
					resource: [],
				},
				undefined,
				undefined,
			);
		});

		it('evaluates resource scope correctly', () => {
			const newScope = 'example:list' as Scope;
			const store = useRBACStore();
			store.addResourceScope(newScope, { resourceId: '1', resourceType: 'variable' });

			const result = store.hasScope(newScope, { resourceId: '1', resourceType: 'variable' });
			expect(result).toBe(true);
			expect(vi.mocked(hasScope)).toHaveBeenCalledWith(
				newScope,
				{
					global: expect.any(Array),
					project: [],
					resource: expect.arrayContaining([newScope]),
				},
				undefined,
				undefined,
			);
		});

		it('evaluates project and resource scope correctly', () => {
			const newScope = 'example:list' as Scope;
			const store = useRBACStore();
			store.addProjectScope(newScope, { projectId: '1' });
			store.addResourceScope(newScope, { resourceId: '1', resourceType: 'variable' });

			const result = store.hasScope(newScope, {
				projectId: '1',
				resourceId: '1',
				resourceType: 'variable',
			});
			expect(result).toBe(true);
			expect(vi.mocked(hasScope)).toHaveBeenCalledWith(
				newScope,
				{
					global: expect.any(Array),
					project: expect.arrayContaining([newScope]),
					resource: expect.arrayContaining([newScope]),
				},
				undefined,
				undefined,
			);
		});
	});
});
