import { capabilities, capabilityRegistry, type ProjectContext } from '@n8n/frontend-module-sdk';
import { createComponentRenderer, mockedStore } from '@n8n/frontend-test-utils';
import type { IUser } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';
import { computed, reactive, ref } from 'vue';

import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import { PROMOTIONS_SETTINGS_SCOPES } from '../promotions.constants';
import PromotionsSettingsView from './PromotionsSettingsView.vue';

const api = vi.hoisted(() => ({
	fetchPromotionEnvironments: vi.fn<typeof PromotionsApi.fetchPromotionEnvironments>(),
	fetchPromotionEnvironment: vi.fn<typeof PromotionsApi.fetchPromotionEnvironment>(),
	deletePromotionEnvironment: vi.fn<typeof PromotionsApi.deletePromotionEnvironment>(),
	deleteProviderIfUnused: vi.fn<typeof PromotionsApi.deleteProviderIfUnused>(),
	connectPromotionCheckout: vi.fn<typeof PromotionsApi.connectPromotionCheckout>(),
	fetchMissingPromotionProjects: vi.fn<typeof PromotionsApi.fetchMissingPromotionProjects>(),
}));

vi.mock('../promotionsSettings.api', () => api);

// The protected instance setting of the shell.
const shell = reactive({ isProtected: false });
const switchTo = vi.fn();
const environmentsSettings = {
	isPromotionsEnabled: () => true,
	isProtected: () => shell.isProtected,
	loadPreferences: vi.fn<() => Promise<void>>(),
	setProtected: vi.fn<(value: boolean) => Promise<void>>(),
	useVersionSwitch: () => ({ busy: ref(false), canSwitchBack: computed(() => true), switchTo }),
};

const mockConfirm = vi.fn();
const showMessage = vi.fn();

vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage }),
}));

vi.mock('vue-router', async () => ({
	...(await vi.importActual<object>('vue-router')),
	useRouter: () => ({ push: vi.fn() }),
}));

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const applyEnvironment: PromotionEnvironment = {
	id: 'environment-apply',
	name: 'Development',
	scope: 'instance',
	direction: 'apply',
	remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
	provider: {
		id: 'provider-ssh',
		name: 'Company Git',
		type: 'git',
		authType: 'ssh-key',
		...timestamps,
	},
	settings: { schemaVersion: 1, branchName: 'main' },
	checkout: { hasCheckout: true, matchesEnvironment: true },
	...timestamps,
};

const renderView = createComponentRenderer(PromotionsSettingsView);

const menuButton = (card: HTMLElement) =>
	within(within(card).getByTestId('promotion-environment-menu')).getByRole('button');

async function testConnection(card: HTMLElement) {
	await userEvent.click(menuButton(card));
	await userEvent.click(await screen.findByTestId('action-connect'));
}

describe('PromotionsSettingsView', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		api.fetchMissingPromotionProjects.mockResolvedValue({
			environmentId: applyEnvironment.id,
			git: null,
			data: [{ id: 'missing-project', name: 'Billing' }],
		});
		createTestingPinia({ stubActions: false });
		shell.isProtected = false;
		environmentsSettings.setProtected.mockImplementation(async (value) => {
			shell.isProtected = value;
		});
		capabilityRegistry.provide(capabilities.environmentsSettings, environmentsSettings);
		capabilityRegistry.provide(capabilities.projectContext, mock<ProjectContext>());
	});

	afterEach(() => {
		capabilityRegistry.clear();
	});

	it.each(['project:create', 'promotions:apply'] as const)(
		'checks project creation permission for a settings user with %s',
		async (permission) => {
			useRBACStore().setGlobalScopes([...PROMOTIONS_SETTINGS_SCOPES, permission]);
			api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment]);
			api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment);
			renderView();

			const button = await screen.findByRole('button', { name: 'Add 1 missing project' });
			if (permission === 'project:create') expect(button).toBeEnabled();
			else expect(button).toBeDisabled();
		},
	);

	it('shows the Preview and limited enterprise readiness tags next to the title on enterprise', () => {
		mockedStore(useSettingsStore).isEnterprisePlan = true;
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		renderView();

		const titleRow = screen.getByRole('heading', {
			level: 1,
			name: 'Environments',
		}).parentElement;
		const readinessBadge = screen.getByTestId('promotions-enterprise-readiness-badge');
		expect(titleRow).toContainElement(screen.getByTestId('promotions-preview-badge'));
		expect(titleRow).toContainElement(readinessBadge);
		expect(readinessBadge).toHaveTextContent('Limited enterprise readiness');
	});

	it('shows only the Preview tag on other plans', () => {
		mockedStore(useSettingsStore).isEnterprisePlan = false;
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		renderView();

		expect(screen.getByTestId('promotions-preview-badge')).toBeInTheDocument();
		expect(screen.queryByTestId('promotions-enterprise-readiness-badge')).not.toBeInTheDocument();
	});

	it('checks for missing projects again on click after the check failed', async () => {
		useRBACStore().setGlobalScopes([...PROMOTIONS_SETTINGS_SCOPES, 'project:create']);
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment]);
		api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment);
		api.fetchMissingPromotionProjects.mockRejectedValueOnce(new Error('Network error'));
		renderView();

		const button = await screen.findByRole('button', { name: 'Add missing projects' });
		await waitFor(() => expect(button).toBeEnabled());
		await userEvent.click(button);

		expect(await screen.findByTestId('promotion-missing-projects-dialog')).toBeInTheDocument();
		expect(api.fetchMissingPromotionProjects).toHaveBeenCalledTimes(2);
	});

	it('removes the environment, then its provider', async () => {
		useRBACStore().setGlobalScopes([...PROMOTIONS_SETTINGS_SCOPES, 'project:create']);
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment]);
		api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment);
		const removal = Promise.withResolvers<undefined>();
		api.deletePromotionEnvironment.mockReturnValueOnce(removal.promise);
		mockConfirm.mockResolvedValue('confirm');
		renderView();

		const card = await screen.findByTestId('promotion-environment-card-apply');
		const addProjects = await within(card).findByRole('button', { name: 'Add 1 missing project' });
		expect(addProjects).toBeEnabled();
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		await userEvent.click(
			within(within(card).getByTestId('promotion-environment-menu')).getByRole('button'),
		);
		await userEvent.click(await screen.findByTestId('action-remove'));
		await waitFor(() => expect(addProjects).toBeDisabled());
		removal.resolve(undefined);

		expect(await screen.findByTestId('promotion-environment-add-apply')).toBeInTheDocument();
		// A plain Git environment has no promotion reviews to close.
		expect(mockConfirm).toHaveBeenCalledWith(
			expect.not.stringContaining('promotion reviews'),
			expect.anything(),
			expect.anything(),
		);
		expect(api.deletePromotionEnvironment).toHaveBeenCalledWith(
			expect.anything(),
			'environment-apply',
		);
		expect(api.deleteProviderIfUnused).toHaveBeenCalledWith(expect.anything(), 'provider-ssh');
		expect(api.deletePromotionEnvironment.mock.invocationCallOrder[0]).toBeLessThan(
			api.deleteProviderIfUnused.mock.invocationCallOrder[0],
		);
	});

	it.each([
		{
			direction: 'promote' as const,
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
			message: 'open promotion reviews close in n8n',
		},
		{
			direction: 'apply' as const,
			settings: applyEnvironment.settings,
			message: 'If no other environment uses the same provider',
		},
	])(
		'only mentions promotion reviews when it removes a Promote environment on a Git host: $direction',
		async ({ direction, settings, message }) => {
			const gitlabEnvironment = {
				...applyEnvironment,
				id: `environment-${direction}`,
				direction,
				settings,
				provider: { ...applyEnvironment.provider, type: 'gitlab', authType: 'token' },
			} as PromotionEnvironment;
			api.fetchPromotionEnvironments.mockResolvedValue([gitlabEnvironment]);
			api.fetchPromotionEnvironment.mockResolvedValue(gitlabEnvironment);
			mockConfirm.mockResolvedValue('cancel');
			renderView();

			const card = await screen.findByTestId(`promotion-environment-card-${direction}`);
			await userEvent.click(
				within(within(card).getByTestId('promotion-environment-menu')).getByRole('button'),
			);
			await userEvent.click(await screen.findByTestId('action-remove'));

			await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
			const [shown] = mockConfirm.mock.calls[0];
			expect(shown).toContain(message);
			if (direction === 'apply') expect(shown).not.toContain('promotion reviews');
			expect(api.deletePromotionEnvironment).not.toHaveBeenCalled();
		},
	);

	// The shell asks for confirmation and saves the version.
	it('switches the instance back to Environments v1', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		renderView();

		await userEvent.click(await screen.findByTestId('promotions-switch-to-v1'));

		expect(switchTo).toHaveBeenCalledWith('v1');
	});

	it('keeps each card busy until its own connection test finishes', async () => {
		mockedStore(useUsersStore).currentUser = mock<IUser>({
			globalScopes: ['promotions:manageEnvironments'],
		});
		const promoteEnvironment = {
			...applyEnvironment,
			id: 'environment-promote',
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		} as PromotionEnvironment;
		const environments = [applyEnvironment, promoteEnvironment];
		api.fetchPromotionEnvironments.mockResolvedValue(environments);
		api.fetchPromotionEnvironment.mockImplementation(
			async (_, id) => environments.find((environment) => environment.id === id)!,
		);
		let finishApply = () => {};
		api.connectPromotionCheckout
			.mockImplementationOnce(
				async () =>
					await new Promise((resolve) => {
						finishApply = () => resolve(mock());
					}),
			)
			.mockResolvedValueOnce(mock());
		renderView();

		const applyCard = await screen.findByTestId('promotion-environment-card-apply');
		const promoteCard = screen.getByTestId('promotion-environment-card-promote');
		await testConnection(applyCard);
		await testConnection(promoteCard);

		const applyMenu = menuButton(applyCard);
		await waitFor(() => expect(menuButton(promoteCard)).toBeEnabled());
		expect(applyMenu).toBeDisabled();
		expect(within(applyCard).getByTestId('promotion-environment-connecting')).toBeInTheDocument();
		finishApply();
		await waitFor(() => expect(applyMenu).toBeEnabled());
	});

	it('shows the connection test result on the card', async () => {
		mockedStore(useUsersStore).currentUser = mock<IUser>({
			globalScopes: ['promotions:manageEnvironments'],
		});
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment]);
		api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment);
		api.connectPromotionCheckout
			.mockRejectedValueOnce(new Error('Authentication failed'))
			.mockResolvedValueOnce(mock());
		renderView();

		const card = await screen.findByTestId('promotion-environment-card-apply');
		expect(screen.queryByTestId('promotion-environment-retry')).not.toBeInTheDocument();
		await testConnection(card);

		expect(await screen.findByTestId('promotion-environment-connect-error')).toHaveTextContent(
			'Authentication failed',
		);
		expect(showMessage).not.toHaveBeenCalled();

		await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

		await waitFor(() =>
			expect(screen.queryByTestId('promotion-environment-connect-error')).not.toBeInTheDocument(),
		);
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Connected to Development',
			type: 'success',
		});
		expect(screen.queryByTestId('promotion-environment-retry')).not.toBeInTheDocument();
	});

	it('sets the Remove action apart from the other actions with a divider', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment]);
		api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment);
		renderView();

		await userEvent.click(
			menuButton(await screen.findByTestId('promotion-environment-card-apply')),
		);

		const remove = await screen.findByTestId('action-remove');
		const separators = screen.getAllByRole('separator');
		expect(separators).toHaveLength(1);
		expect(separators[0].nextElementSibling).toBe(remove);
	});

	it('hides the connection test from a user who cannot connect', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment]);
		api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment);
		renderView();

		await userEvent.click(
			menuButton(await screen.findByTestId('promotion-environment-card-apply')),
		);

		expect(await screen.findByTestId('action-remove')).toBeInTheDocument();
		expect(screen.queryByTestId('action-connect')).not.toBeInTheDocument();
	});

	// Each main has its own local copy, so the card must not depend on it.
	it.each([
		['has a local copy', { hasCheckout: true, matchesEnvironment: true }],
		['has no local copy', { hasCheckout: false, matchesEnvironment: false }],
		['has an out-of-date local copy', { hasCheckout: true, matchesEnvironment: false }],
	])('shows the same card when the instance %s', async (_, checkout) => {
		mockedStore(useUsersStore).currentUser = mock<IUser>({
			globalScopes: ['promotions:promote', 'promotions:apply'],
		});
		const promoteEnvironment = {
			...applyEnvironment,
			id: 'environment-promote',
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
			checkout,
		} as PromotionEnvironment;
		const environments = [{ ...applyEnvironment, checkout }, promoteEnvironment];
		api.fetchPromotionEnvironments.mockResolvedValue(environments);
		api.fetchPromotionEnvironment.mockImplementation(
			async (_, id) => environments.find((environment) => environment.id === id)!,
		);
		renderView();

		expect(await screen.findByTestId('apply-instance-button')).toBeEnabled();
		expect(screen.getByTestId('promote-instance-button')).toBeEnabled();
		expect(screen.queryByText(/connected|out of date/i)).not.toBeInTheDocument();
		expect(api.fetchMissingPromotionProjects).toHaveBeenCalledTimes(1);
	});

	it('allows a toggle only after the current protection state loads', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		const preferences = Promise.withResolvers<undefined>();
		environmentsSettings.loadPreferences.mockReturnValue(preferences.promise);
		renderView();

		const toggle = await screen.findByRole('switch', { name: 'Protected instance' });
		expect(toggle).toBeDisabled();
		shell.isProtected = true;
		preferences.resolve(undefined);
		await waitFor(() => expect(toggle).toBeEnabled());
		expect(toggle).toBeChecked();
		await userEvent.click(toggle);

		expect(environmentsSettings.setProtected).toHaveBeenCalledWith(false);
		expect(toggle).not.toBeChecked();
	});

	it('keeps the protection state when saving fails', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		shell.isProtected = true;
		environmentsSettings.setProtected.mockRejectedValue(new Error('Request failed'));
		renderView();

		const toggle = await screen.findByRole('switch', { name: 'Protected instance' });
		await waitFor(() => expect(toggle).toBeChecked());
		await userEvent.click(toggle);

		expect(environmentsSettings.setProtected).toHaveBeenCalled();
		expect(toggle).toBeChecked();
	});
});
