const mockIsTrulyEmpty = vi.fn();

let mockIsCloudDeployment = false;
let mockUserIsTrialing = false;
let mockIsAdminOrOwner = false;

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get isCloudDeployment() {
			return mockIsCloudDeployment;
		},
	}),
}));

vi.mock('@/app/stores/cloudPlan.store', () => ({
	useCloudPlanStore: () => ({
		get userIsTrialing() {
			return mockUserIsTrialing;
		},
	}),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		get isAdminOrOwner() {
			return mockIsAdminOrOwner;
		},
	}),
}));

vi.mock('@/features/workflows/readyToRun/composables/useEmptyStateDetection', () => ({
	useEmptyStateDetection: () => ({
		isTrulyEmpty: mockIsTrulyEmpty,
	}),
}));

import { useSurfaceMcpToNewCloudUsersEligibility } from './useSurfaceMcpToNewCloudUsersEligibility';

describe('useSurfaceMcpToNewCloudUsersEligibility', () => {
	beforeEach(() => {
		mockIsCloudDeployment = false;
		mockUserIsTrialing = false;
		mockIsAdminOrOwner = false;
		mockIsTrulyEmpty.mockReset();
		mockIsTrulyEmpty.mockReturnValue(false);
	});

	it('returns eligible when all local gate conditions pass', () => {
		mockIsCloudDeployment = true;
		mockUserIsTrialing = true;
		mockIsAdminOrOwner = true;
		mockIsTrulyEmpty.mockReturnValue(true);

		const { isEligible } = useSurfaceMcpToNewCloudUsersEligibility();

		expect(isEligible.value).toBe(true);
	});

	it('returns ineligible for non-admin users', () => {
		mockIsCloudDeployment = true;
		mockUserIsTrialing = true;
		mockIsAdminOrOwner = false;
		mockIsTrulyEmpty.mockReturnValue(true);

		const { isEligible } = useSurfaceMcpToNewCloudUsersEligibility();

		expect(isEligible.value).toBe(false);
	});

	it('returns ineligible outside cloud deployments', () => {
		mockIsCloudDeployment = false;
		mockUserIsTrialing = true;
		mockIsAdminOrOwner = true;
		mockIsTrulyEmpty.mockReturnValue(true);

		const { isEligible } = useSurfaceMcpToNewCloudUsersEligibility();

		expect(isEligible.value).toBe(false);
	});

	it('returns ineligible for non-trial users', () => {
		mockIsCloudDeployment = true;
		mockUserIsTrialing = false;
		mockIsAdminOrOwner = true;
		mockIsTrulyEmpty.mockReturnValue(true);

		const { isEligible } = useSurfaceMcpToNewCloudUsersEligibility();

		expect(isEligible.value).toBe(false);
	});
});
