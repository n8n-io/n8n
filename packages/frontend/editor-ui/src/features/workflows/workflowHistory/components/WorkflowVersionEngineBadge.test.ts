import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import WorkflowVersionEngineBadge from './WorkflowVersionEngineBadge.vue';

const renderComponent = createComponentRenderer(WorkflowVersionEngineBadge);

const renderBadge = (
	settings: { engineType?: 'v1' | 'v2' } | null,
	{ engineV2ModuleActive = true } = {},
) => {
	const pinia = createTestingPinia();
	mockedStore(useSettingsStore).isModuleActive.mockImplementation(
		(name: string) => engineV2ModuleActive && name === 'engine-v2',
	);
	return renderComponent({ pinia, props: { settings } });
};

describe('WorkflowVersionEngineBadge', () => {
	it('shows the engine of the version', () => {
		const { getByTestId } = renderBadge({ engineType: 'v2' });

		expect(getByTestId('workflow-history-engine-badge')).toHaveTextContent('Engine v2');
	});

	it('shows v1 for a version without an engine', () => {
		const { getByTestId } = renderBadge(null);

		expect(getByTestId('workflow-history-engine-badge')).toHaveTextContent('Engine v1');
	});

	it('shows nothing without the engine-v2 module', () => {
		const { queryByTestId } = renderBadge({ engineType: 'v2' }, { engineV2ModuleActive: false });

		expect(queryByTestId('workflow-history-engine-badge')).not.toBeInTheDocument();
	});
});
