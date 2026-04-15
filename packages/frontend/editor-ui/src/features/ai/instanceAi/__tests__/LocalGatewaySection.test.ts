import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import LocalGatewaySection from '../components/settings/LocalGatewaySection.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const renderComponent = createComponentRenderer(LocalGatewaySection);

describe('LocalGatewaySection', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiSettingsStore();
		store.$patch({ preferences: { localGatewayDisabled: false } });
	});

	it('shows heading', () => {
		const { getByText } = renderComponent({
			props: { isAdmin: false, isGatewayEnabled: true, isSaving: false },
		});
		expect(getByText('instanceAi.filesystem.label')).toBeVisible();
	});

	it('shows admin toggle when isAdmin is true', () => {
		const { getByTestId } = renderComponent({
			props: { isAdmin: true, isGatewayEnabled: true, isSaving: false },
		});
		expect(getByTestId('n8n-agent-gateway-toggle')).toBeVisible();
	});

	it('hides admin toggle when isAdmin is false', () => {
		const { queryByTestId } = renderComponent({
			props: { isAdmin: false, isGatewayEnabled: true, isSaving: false },
		});
		expect(queryByTestId('n8n-agent-gateway-toggle')).toBeNull();
	});

	it('shows admin toggle tooltip with info icon', () => {
		const { getByText } = renderComponent({
			props: { isAdmin: true, isGatewayEnabled: true, isSaving: false },
		});
		expect(getByText('instanceAi.filesystem.adminToggle')).toBeVisible();
	});

	it('emits toggleGateway when admin toggle is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { isAdmin: true, isGatewayEnabled: false, isSaving: false },
		});
		await userEvent.click(getByTestId('n8n-agent-gateway-toggle'));
		expect(emitted('toggleGateway')).toBeDefined();
	});

	it('disables admin toggle when isSaving is true', () => {
		const { getByTestId } = renderComponent({
			props: { isAdmin: true, isGatewayEnabled: true, isSaving: true },
		});
		expect(getByTestId('n8n-agent-gateway-toggle')).toHaveClass('is-disabled');
	});

	it('hides user toggle and content when gateway is disabled', () => {
		const { queryByText } = renderComponent({
			props: { isAdmin: true, isGatewayEnabled: false, isSaving: false },
		});
		expect(queryByText('instanceAi.filesystem.userToggle')).toBeNull();
	});

	it('shows user toggle when gateway is enabled', () => {
		const { getByText } = renderComponent({
			props: { isAdmin: false, isGatewayEnabled: true, isSaving: false },
		});
		expect(getByText('instanceAi.filesystem.userToggle')).toBeVisible();
	});

	it('calls save immediately when user toggle is clicked', async () => {
		const saveSpy = vi.spyOn(store, 'save').mockResolvedValue();
		const { getByText } = renderComponent({
			props: { isAdmin: false, isGatewayEnabled: true, isSaving: false },
		});

		const userToggleRow = getByText('instanceAi.filesystem.userToggle').closest('div')!;
		const switchEl = within(userToggleRow).getByRole('switch');
		await userEvent.click(switchEl);

		expect(store.preferencesDraft.localGatewayDisabled).toBe(true);
		expect(saveSpy).toHaveBeenCalled();
	});

	it('shows setup command when gateway is not connected and user toggle is on', () => {
		store.$patch({ preferences: { localGatewayDisabled: false } });
		const { getByText } = renderComponent({
			props: { isAdmin: false, isGatewayEnabled: true, isSaving: false },
		});
		expect(getByText('instanceAi.filesystem.setupCommand')).toBeVisible();
	});

	it('hides setup content when user toggle is off', () => {
		store.$patch({ preferences: { localGatewayDisabled: true } });
		const { queryByText } = renderComponent({
			props: { isAdmin: false, isGatewayEnabled: true, isSaving: false },
		});
		expect(queryByText('instanceAi.filesystem.setupCommand')).toBeNull();
	});
});
