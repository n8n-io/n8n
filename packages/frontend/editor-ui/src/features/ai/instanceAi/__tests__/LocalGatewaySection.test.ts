import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import LocalGatewaySection from '../components/settings/LocalGatewaySection.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSettingsStore } from '@/app/stores/settings.store';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('../instanceAi.api', () => ({
	createGatewayLink: vi.fn(),
	getGatewayStatus: vi.fn().mockResolvedValue({
		connected: false,
		directory: null,
		hostIdentifier: null,
		toolCategories: [],
	}),
}));

const renderComponent = createComponentRenderer(LocalGatewaySection);

describe('LocalGatewaySection', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiSettingsStore();
		settingsStore = useSettingsStore();
		settingsStore.moduleSettings = {
			'instance-ai': {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: true,
				cloudManaged: false,
			},
		};
		store.$patch({ preferences: { localGatewayDisabled: false } });
	});

	it('shows heading and description', () => {
		const { getByText } = renderComponent();
		expect(getByText('instanceAi.filesystem.label')).toBeVisible();
		expect(getByText('instanceAi.filesystem.description')).toBeVisible();
	});

	it('shows user toggle switch', () => {
		const { container } = renderComponent();
		const switchEl = container.querySelector('.el-switch');
		expect(switchEl).toBeTruthy();
	});

	it('disables user toggle when admin has disabled gateway', () => {
		settingsStore.moduleSettings = {
			'instance-ai': {
				enabled: true,
				localGatewayDisabled: true,
				proxyEnabled: false,
				optinModalDismissed: true,
				cloudManaged: false,
			},
		};
		const { container } = renderComponent();
		const switchEl = container.querySelector('.el-switch');
		expect(switchEl?.classList.contains('is-disabled')).toBe(true);
	});

	it('shows warning when admin has disabled gateway', () => {
		settingsStore.moduleSettings = {
			'instance-ai': {
				enabled: true,
				localGatewayDisabled: true,
				proxyEnabled: false,
				optinModalDismissed: true,
				cloudManaged: false,
			},
		};
		const { getByText } = renderComponent();
		expect(getByText('settings.n8nAgent.computerUse.disabled.warning')).toBeVisible();
	});

	it('hides warning when admin has not disabled gateway', () => {
		const { queryByText } = renderComponent();
		expect(queryByText('settings.n8nAgent.computerUse.disabled.warning')).toBeNull();
	});

	it('calls save immediately when user toggle is clicked', async () => {
		const saveSpy = vi.spyOn(store, 'save').mockResolvedValue();
		const { container } = renderComponent();

		const switchRow = container.querySelector('[class*="switchRow"]')!;
		const switchEl = within(switchRow as HTMLElement).getByRole('switch');
		await userEvent.click(switchEl);

		expect(store.preferencesDraft.localGatewayDisabled).toBe(true);
		expect(saveSpy).toHaveBeenCalled();
	});

	it('shows setup command when gateway is not connected and user toggle is on', () => {
		store.$patch({ preferences: { localGatewayDisabled: false } });
		const { getByText } = renderComponent();
		expect(getByText('instanceAi.filesystem.setupCommand')).toBeVisible();
	});

	it('hides setup content when user toggle is off', () => {
		store.$patch({
			preferences: { localGatewayDisabled: true },
			preferencesDraft: { localGatewayDisabled: true },
		});
		const { queryByText } = renderComponent();
		expect(queryByText('instanceAi.filesystem.setupCommand')).toBeNull();
	});
});
