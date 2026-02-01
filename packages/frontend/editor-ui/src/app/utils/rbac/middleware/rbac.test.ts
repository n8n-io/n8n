import { useRBACStore } from '@/app/stores/rbac.store';
import { rbacMiddleware } from '@/app/utils/rbac/middleware/rbac';
import { VIEWS } from '@/app/constants';
import {
	inferProjectIdFromRoute,
	inferResourceIdFromRoute,
	inferResourceTypeFromRoute,
} from '@/app/utils/rbacUtils';
import type { RouteLocationNormalized } from 'vue-router';
import type { Scope } from '@n8n/permissions';

vi.mock('@/app/stores/rbac.store', () => ({
	useRBACStore: vi.fn(),
}));

vi.mock('@/app/utils/rbacUtils', () => ({
	inferProjectIdFromRoute: vi.fn(),
	inferResourceIdFromRoute: vi.fn(),
	inferResourceTypeFromRoute: vi.fn(),
}));

describe('Middleware', () => {
	describe('rbac', () => {
		it('should redirect to homepage if the user does not have the required scope', async () => {
			vi.mocked(useRBACStore).mockReturnValue({
				hasScope: vi.fn().mockReturnValue(false),
			} as unknown as ReturnType<typeof useRBACStore>);
			vi.mocked(inferProjectIdFromRoute).mockReturnValue('123');
			vi.mocked(inferResourceTypeFromRoute).mockReturnValue('workflow');
			vi.mocked(inferResourceIdFromRoute).mockReturnValue('456');

			const nextMock = vi.fn();
			const scope: Scope = 'workflow:read';

			await rbacMiddleware({} as RouteLocationNormalized, {} as RouteLocationNormalized, nextMock, {
				scope,
			});

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should allow navigation if the user has the required scope', async () => {
			vi.mocked(useRBACStore).mockReturnValue({
				hasScope: vi.fn().mockReturnValue(true),
			} as unknown as ReturnType<typeof useRBACStore>);
			vi.mocked(inferProjectIdFromRoute).mockReturnValue('123');
			vi.mocked(inferResourceTypeFromRoute).mockReturnValue(undefined);
			vi.mocked(inferResourceIdFromRoute).mockReturnValue(undefined);

			const nextMock = vi.fn();
			const scope: Scope = 'workflow:read';

			await rbacMiddleware({} as RouteLocationNormalized, {} as RouteLocationNormalized, nextMock, {
				scope,
			});

			expect(nextMock).toHaveBeenCalledTimes(0);
		});
	});
});
