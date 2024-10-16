import { hasPermission } from '@/utils/rbac/permissions';
import * as checks from '@/utils/rbac/checks';

vi.mock('@/utils/rbac/checks', () => ({
	hasRole: vi.fn(),
	hasScope: vi.fn(),
	isGuest: vi.fn(),
	isDefaultUser: vi.fn(),
	isInstanceOwner: vi.fn(),
	isAuthenticated: vi.fn(),
	isEnterpriseFeatureEnabled: vi.fn(),
	isValid: vi.fn(),
}));

describe('hasPermission()', () => {
	it('should return true if all permissions are valid', () => {
		vi.mocked(checks.hasRole).mockReturnValue(true);
		vi.mocked(checks.hasScope).mockReturnValue(true);
		vi.mocked(checks.isGuest).mockReturnValue(true);
		vi.mocked(checks.isDefaultUser).mockReturnValue(true);
		vi.mocked(checks.isInstanceOwner).mockReturnValue(true);
		vi.mocked(checks.isAuthenticated).mockReturnValue(true);
		vi.mocked(checks.isEnterpriseFeatureEnabled).mockReturnValue(true);
		vi.mocked(checks.isValid).mockReturnValue(true);

		expect(
			hasPermission([
				'authenticated',
				'custom',
				'enterprise',
				'guest',
				'rbac',
				'role',
				'defaultUser',
				'instanceOwner',
			]),
		).toBe(true);
	});

	it('should return false if any permission is invalid', () => {
		vi.mocked(checks.hasRole).mockReturnValue(true);
		vi.mocked(checks.isGuest).mockReturnValue(true);
		vi.mocked(checks.isAuthenticated).mockReturnValue(true);
		vi.mocked(checks.isEnterpriseFeatureEnabled).mockReturnValue(true);
		vi.mocked(checks.isValid).mockReturnValue(true);

		vi.mocked(checks.hasScope).mockReturnValue(false);

		expect(hasPermission(['authenticated', 'custom', 'enterprise', 'guest', 'rbac', 'role'])).toBe(
			false,
		);
	});

	it('should return true for a specific valid permission', () => {
		vi.mocked(checks.isAuthenticated).mockReturnValue(true);

		expect(hasPermission(['authenticated'])).toBe(true);
	});

	it('should return false for a specific invalid permission', () => {
		vi.mocked(checks.isGuest).mockReturnValue(false);

		expect(hasPermission(['guest'])).toBe(false);
	});

	it('should call permission function with given permission options', () => {
		const customFn = () => true;
		vi.mocked(checks.isValid).mockReturnValue(true);

		hasPermission(['custom'], {
			custom: customFn,
		});

		expect(checks.isValid).toHaveBeenCalledWith(customFn);
	});
});
