import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useUsageStore } from '../usage.store';
import SettingsUsageAndPlan from './SettingsUsageAndPlan.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '../usage.constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useToast } from '@/app/composables/useToast';
import { waitFor } from '@testing-library/vue';
import { useRBACStore } from '@/app/stores/rbac.store';

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: vi.fn(),
	}),
}));

const mockRouteQuery: Record<string, string> = vi.hoisted(() => ({}));
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
let rbacStore: ReturnType<typeof mockedStore<typeof useRBACStore>>;
let mockToast: ReturnType<typeof useToast>;

const pinia = createTestingPinia({ stubActions: false });
const renderComponent = createComponentRenderer(SettingsUsageAndPlan, { pinia });

describe('SettingsUsageAndPlan', () => {
	beforeEach(() => {
		usageStore = mockedStore(useUsageStore);
		uiStore = mockedStore(useUIStore);
		usersStore = mockedStore(useUsersStore);
		rbacStore = mockedStore(useRBACStore);

		rbacStore.setGlobalScopes([]);

		mockToast = {
			showMessage: vi.fn(),
			showError: vi.fn(),
		} as unknown as ReturnType<typeof useToast>;
		vi.mocked(useToast).mockReturnValue(mockToast);

		usageStore.viewPlansUrl = 'https://subscription.n8n.io';
		usageStore.managePlanUrl = 'https://subscription.n8n.io';
		usageStore.isLoading = false;
		usageStore.setLoading = vi.fn((value: boolean) => {
			usageStore.isLoading = value;
		});
		usageStore.getLicenseInfo = vi.fn().mockResolvedValue(undefined);
		usageStore.activateLicense = vi.fn().mockResolvedValue(undefined);
		usageStore.refreshLicenseManagementToken = vi.fn().mockResolvedValue(undefined);

		mockReplace.mockReset();
		Object.keys(mockRouteQuery).forEach((key) => {
			delete mockRouteQuery[key];
		});
	});

	it('should not throw errors when rendering', async () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the title only while loading', async () => {
		usageStore.isLoading = true;
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

	it('should correctly call activateLicense on non-eula acceptance', async () => {
		usageStore.isLoading = false;
		usageStore.planName = 'Community';
		usersStore.currentUser = {
			globalScopes: ['license:manage'],
		} as IUser;
		rbacStore.setGlobalScopes(['license:manage']);
		usageStore.activateLicense.mockImplementation(async () => {});

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button', { name: /activation/i }));
		const input = document.querySelector('input') as HTMLInputElement;
		await userEvent.type(input, 'test-key-123');
		await userEvent.click(getByRole('button', { name: /activate/i }));

		await waitFor(() => {
			expect(usageStore.activateLicense).toHaveBeenCalledTimes(1);
			expect(usageStore.activateLicense).toHaveBeenLastCalledWith('test-key-123', undefined);
		});

		expect(mockToast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'success',
			}),
		);
	});

	describe('License activation with EULA', () => {
		it('should show EULA modal when activation fails with 400 error and eulaUrl', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			rbacStore.setGlobalScopes(['license:manage']);

			const { getByRole, findByTestId } = renderComponent();

			const activationButton = getByRole('button', { name: /activation/i });
			await userEvent.click(activationButton);

			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');

			usageStore.activateLicense.mockRejectedValueOnce({
				httpStatusCode: 400,
				meta: { eulaUrl: 'https://example.com/eula.pdf' },
			});

			const activateButton = getByRole('button', { name: /activate/i });
			await userEvent.click(activateButton);

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
			rbacStore.setGlobalScopes(['license:manage']);
			usageStore.activateLicense
				.mockRejectedValueOnce({
					httpStatusCode: 400,
					meta: { eulaUrl: 'https://example.com/eula.pdf' },
				})
				.mockResolvedValueOnce(undefined);

			const { getByRole, findByTestId } = renderComponent();

			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');
			await userEvent.click(getByRole('button', { name: /activate/i }));

			const eulaModal = await findByTestId('eula-acceptance-modal');
			expect(eulaModal).toBeInTheDocument();

			const checkbox = (await findByTestId('eula-checkbox')).querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			await userEvent.click(checkbox);

			const acceptButton = await findByTestId('eula-accept-button');
			await userEvent.click(acceptButton);

			await waitFor(() => {
				expect(usageStore.activateLicense).toHaveBeenCalledTimes(2);
				expect(usageStore.activateLicense).toHaveBeenLastCalledWith(
					'test-key-123',
					'https://example.com/eula.pdf',
				);
			});

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
			rbacStore.setGlobalScopes(['license:manage']);
			usageStore.activateLicense.mockRejectedValueOnce({
				httpStatusCode: 400,
				meta: { eulaUrl: 'https://example.com/eula.pdf' },
			});

			const { getByRole, findByTestId } = renderComponent();

			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');
			await userEvent.click(getByRole('button', { name: /activate/i }));

			const eulaModal = await findByTestId('eula-acceptance-modal');
			expect(eulaModal).toBeInTheDocument();

			const cancelButton = await findByTestId('eula-cancel-button');
			await userEvent.click(cancelButton);

			expect(usageStore.activateLicense).toHaveBeenCalledTimes(1);
		});

		it('should preserve activation key during EULA flow and send it with acceptance', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			rbacStore.setGlobalScopes(['license:manage']);
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

			// Click activate - this should trigger EULA modal
			await userEvent.click(getByRole('button', { name: /activate/i }));

			// EULA modal should appear
			const eulaModal = await findByTestId('eula-acceptance-modal');
			expect(eulaModal).toBeInTheDocument();

			// Accept EULA
			const checkbox = (await findByTestId('eula-checkbox')).querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			await userEvent.click(checkbox);

			const acceptButton = await findByTestId('eula-accept-button');
			await userEvent.click(acceptButton);

			// Verify the activation key was preserved and sent with EULA acceptance
			await waitFor(() => {
				expect(usageStore.activateLicense).toHaveBeenCalledTimes(2);
				// First call without EULA
				expect(usageStore.activateLicense).toHaveBeenNthCalledWith(1, 'test-key-123', undefined);
				// Second call with EULA URL - key should still be present
				expect(usageStore.activateLicense).toHaveBeenNthCalledWith(
					2,
					'test-key-123',
					'https://example.com/eula.pdf',
				);
			});

			expect(mockToast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
				}),
			);
		});

		it('should show error when activation fails without EULA requirement', async () => {
			usageStore.isLoading = false;
			usageStore.planName = 'Community';
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			rbacStore.setGlobalScopes(['license:manage']);

			const { getByRole } = renderComponent();

			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = document.querySelector('input') as HTMLInputElement;
			await userEvent.type(input, 'test-key-123');

			const error = new Error('Invalid activation key');
			usageStore.activateLicense.mockRejectedValueOnce(error);

			await userEvent.click(getByRole('button', { name: /activate/i }));

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(error, 'Activation failed');
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
					expect(mockToast.showError).toHaveBeenCalledWith(error, 'Activation failed');
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
			rbacStore.setGlobalScopes(['license:manage']);

			renderComponent();

			await waitAllPromises();

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

			renderComponent();

			await waitAllPromises();

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
		it('should open activation modal and show input', async () => {
			usageStore.isLoading = false;
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			rbacStore.setGlobalScopes(['license:manage']);

			const { getByRole } = renderComponent();

			await waitAllPromises();

			await waitFor(() => {
				expect(usageStore.refreshLicenseManagementToken).toHaveBeenCalled();
			});

			await userEvent.click(getByRole('button', { name: /activation/i }));

			await waitFor(
				() => {
					const input = document.querySelector('input') as HTMLInputElement;
					expect(input).toBeTruthy();
					expect(input).toBeVisible();
					expect(input.placeholder).toBe('Activation key');
				},
				{ timeout: 2000 },
			);
		});

		it('should handle modal close and reopen', async () => {
			usageStore.isLoading = false;
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			rbacStore.setGlobalScopes(['license:manage']);

			const { getByRole, findByPlaceholderText } = renderComponent();

			await waitAllPromises();

			await waitFor(() => {
				expect(usageStore.refreshLicenseManagementToken).toHaveBeenCalled();
			});

			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = await findByPlaceholderText('Activation key');
			expect(input).toBeInTheDocument();

			await userEvent.type(input, 'test-key');

			const cancelButton = getByRole('button', { name: /cancel/i });
			await userEvent.click(cancelButton);

			await waitAllPromises();

			await userEvent.click(getByRole('button', { name: /activation/i }));

			await waitFor(async () => {
				const reopenedInput = await findByPlaceholderText('Activation key');
				expect(reopenedInput).toBeInTheDocument();
			});
		});

		it('should clear activation key when cancel button is clicked', async () => {
			usageStore.isLoading = false;
			usersStore.currentUser = {
				globalScopes: ['license:manage'],
			} as IUser;
			rbacStore.setGlobalScopes(['license:manage']);

			const { getByRole, findByPlaceholderText } = renderComponent();

			await waitAllPromises();

			// Open activation modal
			await userEvent.click(getByRole('button', { name: /activation/i }));
			const input = await findByPlaceholderText('Activation key');
			expect(input).toBeInTheDocument();

			// Enter activation key
			await userEvent.type(input, 'test-key-should-be-cleared');
			expect(input).toHaveValue('test-key-should-be-cleared');

			// Click cancel
			const cancelButton = getByRole('button', { name: /cancel/i });
			await userEvent.click(cancelButton);

			await waitAllPromises();

			// Reopen modal
			await userEvent.click(getByRole('button', { name: /activation/i }));

			// Input should be cleared
			await waitFor(async () => {
				const reopenedInput = await findByPlaceholderText('Activation key');
				expect(reopenedInput).toHaveValue('');
			});
		});
	});
});
