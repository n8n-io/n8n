import { useRBACStore } from '@/stores/rbac.store';
import { hasScope } from '@/utils/rbac/checks/hasScope';
import type { ScopeOptions } from '@n8n/permissions';

vi.mock('@/stores/rbac.store', () => ({
	useRBACStore: vi.fn(),
}));

describe('Checks', () => {
	describe('hasScope()', () => {
		it('should return true if no scope is provided', () => {
			expect(hasScope({})).toBe(true);
		});

		it('should call rbacStore.hasScope with the correct parameters', () => {
			const mockHasScope = vi.fn().mockReturnValue(true);
			vi.mocked(useRBACStore).mockReturnValue({
				hasScope: mockHasScope,
			} as unknown as ReturnType<typeof useRBACStore>);

			const scope = 'workflow:read';
			const options: ScopeOptions = { mode: 'allOf' };
			const projectId = 'proj123';
			const resourceType = 'workflow';
			const resourceId = 'res123';

			hasScope({ scope, options, projectId, resourceType, resourceId });

			expect(mockHasScope).toHaveBeenCalledWith(
				scope,
				{ projectId, resourceType, resourceId },
				options,
			);
		});

		it('should return true if rbacStore.hasScope returns true', () => {
			const mockHasScope = vi.fn().mockReturnValue(true);
			vi.mocked(useRBACStore).mockReturnValue({ hasScope: mockHasScope } as unknown as ReturnType<
				typeof useRBACStore
			>);

			expect(hasScope({ scope: 'workflow:read' })).toBe(true);
		});

		it('should return false if rbacStore.hasScope returns false', () => {
			const mockHasScope = vi.fn().mockReturnValue(false);
			vi.mocked(useRBACStore).mockReturnValue({ hasScope: mockHasScope } as unknown as ReturnType<
				typeof useRBACStore
			>);

			expect(hasScope({ scope: 'workflow:read' })).toBe(false);
		});
	});
});
