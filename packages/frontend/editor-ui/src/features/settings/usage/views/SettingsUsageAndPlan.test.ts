import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUsageStore } from '../usage.store';
import SettingsUsageAndPlan from './SettingsUsageAndPlan.vue';
import { useUIStore } from '@/stores/ui.store';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '../usage.constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useToast } from '@/composables/useToast';
import { waitFor } from '@testing-library/vue';

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn(),
}));

vi.mock('@/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

vi.mock('@/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: vi.fn(),
	}),
}));

vi.mock('@/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(() => true),
}));

const mockRouteQuery = vi.hoisted(() => ({}));
const mockReplace = vi.fn();

vi.mock('vue-router', () => {
	return {
		useRoute: () => ({
			query: mockRouteQuery,
		}),
		useRouter: () => ({
			replace: mockReplace,
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

let usageStore: ReturnType<typeof mockedStore<typeof useUsageStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
let mockToast: ReturnType<typeof useToast>;

const renderComponent = createComponentRenderer(SettingsUsageAndPlan);

describe('SettingsUsageAndPlan', () => {
	beforeEach(() => {
		createTestingPinia();
		usageStore = mockedStore(useUsageStore);
		uiStore = mockedStore(useUIStore);
		usersStore = mockedStore(useUsersStore);

		mockToast = {
			showMessage: vi.fn(),
			showError: vi.fn(),
		} as unknown as ReturnType<typeof useToast>;
		vi.mocked(useToast).mockReturnValue(mockToast);

		usageStore.viewPlansUrl = 'https://subscription.n8n.io';
		usageStore.managePlanUrl = 'https://subscription.n8n.io';
		usageStore.setLoading = vi.fn();
		usageStore.getLicenseInfo = vi.fn();
		usageStore.activateLicense = vi.fn();
		usageStore.refreshLicenseManagementToken = vi.fn();

		// Reset mocks
		mockReplace.mockReset();
		Object.assign(mockRouteQuery, {});
	});

	it('should not throw errors when rendering', async () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the title only while loading', async () => {
		const { getByRole } = renderComponent();
		expect(getByRole('heading', { level: 2 })).toBeInTheDocument();
		expect(getByRole('heading').nextElementSibling).toBeNull();
	});

	it('should not show badge but unlock notice', async () => {
		usageStore.isLoading = false;
		usageStore.planName = 'Community';
		usersStore.currentUser = {
			globalScopes: ['community:register'],
		} as IUser;
		const { getByRole, container } = renderComponent();
		expect(getByRole('heading', { level: 3 })).toHaveTextContent('Community');
		expect(container.querySelector('.n8n-badge')).toBeNull();

		expect(getByRole('button', { name: 'Unlock' })).toBeVisible();

		await userEvent.click(getByRole('button', { name: 'Unlock' }));
		expect(uiStore.openModalWithData).toHaveBeenCalledWith(
			expect.objectContaining({ name: COMMUNITY_PLUS_ENROLLMENT_MODAL }),
		);
	});

	it('should show community registered badge', async () => {
		usageStore.isLoading = false;
		usageStore.planName = 'Registered Community';
		const { getByRole, container } = renderComponent();
		expect(getByRole('heading', { level: 3 })).toHaveTextContent('Community Edition');
		expect(getByRole('heading', { level: 3 })).toContain(container.querySelector('.n8n-badge'));
		expect(container.querySelector('.n8n-badge')).toHaveTextContent('Registered');
	});

	describe('License activation with EULA', () => {
		it('should show EULA modal when activation fails with 400 error and eulaUrl', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;

			const { getByRole, findByTestId } = renderComponent();

			// Click Add Activation Key button
			const activationButton = getByRole('button', { name: /activation/i });
			await userEvent.click(activationButton);

			// Type activation key
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');

			// Mock activation error with EULA requirement
			usageStore.activateLicense.mockRejectedValueOnce({
				httpStatusCode: 400,
				meta: { eulaUrl: 'https://example.com/eula.pdf' },
			});

			// Click Activate button
			const activateButton = getByRole('button', { name: /activate/i });
			await userEvent.click(activateButton);

			// EULA modal should appear
			await waitFor(async () => {
				const eulaModal = await findByTestId('eula-acceptance-modal');
				expect(eulaModal).toBeInTheDocument();
			});
		});

		it('should handle EULA acceptance and retry license activation', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			usageStore.activateLicense
				.mockRejectedValueOnce({
					httpStatusCode: 400,
					meta: { eulaUrl: 'https://example.com/eula.pdf' },
				})
				.mockResolvedValueOnce(undefined);

			const { getByRole, findByTestId } = renderComponent();

			// Open activation modal and enter key
			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');
			await userEvent.click(getByRole('button', { name: /activate/i }));

			// EULA modal appears
			const eulaModal = await findByTestId('eula-acceptance-modal');
			expect(eulaModal).toBeInTheDocument();

			// Accept EULA
			const checkbox = (await findByTestId('eula-checkbox')).querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			await userEvent.click(checkbox);

			const acceptButton = await findByTestId('eula-accept-button');
			await userEvent.click(acceptButton);

			// Should call activateLicense again with eulaUri
			await waitFor(() => {
				expect(usageStore.activateLicense).toHaveBeenCalledTimes(2);
				expect(usageStore.activateLicense).toHaveBeenLastCalledWith(
					'test-key-123',
					'https://example.com/eula.pdf',
				);
			});

			// Should show success message
			expect(mockToast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
				}),
			);
		});

		it('should handle EULA cancellation', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			usageStore.activateLicense.mockRejectedValueOnce({
				httpStatusCode: 400,
				meta: { eulaUrl: 'https://example.com/eula.pdf' },
			});

			const { getByRole, findByTestId } = renderComponent();

			// Open activation modal and enter key
			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');
			await userEvent.click(getByRole('button', { name: /activate/i }));

			// EULA modal appears
			const eulaModal = await findByTestId('eula-acceptance-modal');
			expect(eulaModal).toBeInTheDocument();

			// Cancel EULA
			const cancelButton = await findByTestId('eula-cancel-button');
			await userEvent.click(cancelButton);

			// Should not retry activation
			expect(usageStore.activateLicense).toHaveBeenCalledTimes(1);
		});

		it('should handle EULA error with response.data.meta format', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;

			const { getByRole, findByTestId } = renderComponent();

			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');

			// Mock error with response.data.meta format (Axios error format)
			usageStore.activateLicense.mockRejectedValueOnce({
				response: {
					status: 400,
					data: {
						meta: { eulaUrl: 'https://example.com/eula.pdf' },
					},
				},
			});

			await userEvent.click(getByRole('button', { name: /activate/i }));

			// EULA modal should appear
			await waitFor(async () => {
				const eulaModal = await findByTestId('eula-acceptance-modal');
				expect(eulaModal).toBeInTheDocument();
			});
		});

		it('should show error when activation fails without EULA requirement', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;

			const { getByRole } = renderComponent();

			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');

			const error = new Error('Invalid activation key');
			usageStore.activateLicense.mockRejectedValueOnce(error);

			await userEvent.click(getByRole('button', { name: /activate/i }));

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(error, expect.any(String));
			});
		});
	});

	describe('License activation with query parameter', () => {
		it('should activate license from query param on mount', async () => {
			Object.assign(mockRouteQuery, { key: 'query-param-key' });
			usageStore.activateLicense.mockResolvedValueOnce(undefined);

			renderComponent();

			await waitFor(
				() => {
					expect(usageStore.activateLicense).toHaveBeenCalledWith('query-param-key');
					expect(mockReplace).toHaveBeenCalledWith({ query: {} });
					expect(mockToast.showMessage).toHaveBeenCalledWith(
						expect.objectContaining({ type: 'success' }),
					);
				},
				{ timeout: 2000 },
			);
		});

		it('should handle error when activating license from query param', async () => {
			Object.assign(mockRouteQuery, { key: 'invalid-key' });
			const error = new Error('Invalid key');
			usageStore.activateLicense.mockRejectedValueOnce(error);

			renderComponent();

			await waitFor(
				() => {
					expect(mockToast.showError).toHaveBeenCalledWith(error);
				},
				{ timeout: 2000 },
			);
		});
	});

	describe('License management token refresh', () => {
		it('should refresh license management token when user can activate license', async () => {
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			// Reset mocks to avoid interference from previous tests
			Object.assign(mockRouteQuery, {});
			usageStore.refreshLicenseManagementToken.mockResolvedValueOnce(undefined);

			renderComponent();

			await waitFor(
				() => {
					expect(usageStore.refreshLicenseManagementToken).toHaveBeenCalled();
				},
				{ timeout: 2000 },
			);
		});

		it('should get license info when user cannot activate license', async () => {
			usersStore.currentUser = {
				id: '1',
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				globalScopes: [],
			} as IUser;
			// Reset query params
			Object.assign(mockRouteQuery, {});
			usageStore.getLicenseInfo.mockResolvedValueOnce(undefined);

			renderComponent();

			await waitFor(
				() => {
					expect(usageStore.getLicenseInfo).toHaveBeenCalled();
					expect(usageStore.refreshLicenseManagementToken).not.toHaveBeenCalled();
				},
				{ timeout: 2000 },
			);
		});
	});

	describe('Activation modal interactions', () => {
		it('should open activation modal and focus input', async () => {
			usageStore.isLoading = false;
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;

			const { getByRole } = renderComponent();

			await userEvent.click(getByRole('button', { name: /activation/i }));

			await waitFor(
				() => {
					const input = document.querySelector('input') as HTMLInputElement;
					expect(input).toHaveFocus();
				},
				{ timeout: 2000 },
			);
		});

		it('should clear activation key when modal is closed', async () => {
			usageStore.isLoading = false;
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;

			const { getByRole } = renderComponent();

			await userEvent.click(getByRole('button', { name: /activation/i }));

			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key');

			// Close modal
			const cancelButton = getByRole('button', { name: /cancel/i });
			await userEvent.click(cancelButton);

			// Reopen modal
			await userEvent.click(getByRole('button', { name: /activation/i }));

			// Input should be empty
			await waitFor(
				() => {
					const newInput = document.querySelector('input') as HTMLInputElement;
					expect(newInput.value).toBe('');
				},
				{ timeout: 2000 },
			);
		});
	});
});
