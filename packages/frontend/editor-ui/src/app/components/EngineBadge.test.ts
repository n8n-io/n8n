import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import EngineBadge from './EngineBadge.vue';

const renderComponent = createComponentRenderer(EngineBadge);

const renderBadge = (engine: 'v1' | 'v2', { engineV2Enabled = true } = {}) => {
	const pinia = createTestingPinia();
	mockedStore(useSettingsStore).isEngineV2Enabled = engineV2Enabled;
	return renderComponent({ pinia, props: { engine }, attrs: { 'data-test-id': 'engine-badge' } });
};

describe('EngineBadge', () => {
	it.each([
		['v1', 'Engine v1'],
		['v2', 'Engine v2'],
	] as const)('labels engine %s as "%s"', (engine, label) => {
		const { getByTestId } = renderBadge(engine);

		expect(getByTestId('engine-badge')).toHaveTextContent(new RegExp(`^${label}$`));
	});

	it('shows nothing without the engine-v2 module', () => {
		const { queryByTestId } = renderBadge('v2', { engineV2Enabled: false });

		expect(queryByTestId('engine-badge')).not.toBeInTheDocument();
	});
});
