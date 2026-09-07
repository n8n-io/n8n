import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiAppPreview from '../InstanceAiAppPreview.vue';

const renderComponent = createComponentRenderer(InstanceAiAppPreview, {
	pinia: createTestingPinia(),
});

const baseProps = {
	appId: 'app-1',
	projectId: 'proj-1',
	namespace: 'greeter',
};

describe('InstanceAiAppPreview', () => {
	it('renders the served app for the given version in an iframe', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { ...baseProps, versionId: 'v-1' },
		});

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/?v=v-1',
		);
		expect(getByTestId('app-preview-open-in-new-tab')).toHaveAttribute('href', '/apps/greeter/');
		expect(getByTestId('app-preview-open-in-new-tab')).toHaveAttribute('target', '_blank');
		expect(queryByTestId('app-preview-empty')).not.toBeInTheDocument();
	});

	it('shows an empty state until the first build', () => {
		const { getByText, queryByTestId } = renderComponent({ props: baseProps });

		expect(getByText('The assistant has not built this app yet.')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-app-preview-iframe')).not.toBeInTheDocument();
		expect(queryByTestId('app-preview-refresh')).toHaveAttribute('aria-disabled', 'true');
	});

	it('changes the iframe src on refresh', async () => {
		const { getByTestId } = renderComponent({
			props: { ...baseProps, versionId: 'v-1' },
		});

		await fireEvent.click(getByTestId('app-preview-refresh'));

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/?v=v-1&r=1',
		);
	});

	it('reloads the iframe with the new version after a build', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { ...baseProps, versionId: 'v-1' },
		});

		await rerender({ ...baseProps, versionId: 'v-2' });

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/?v=v-2',
		);
	});

	it('shows the building indicator while an apps build call is in flight', () => {
		const { getByTestId } = renderComponent({
			props: { ...baseProps, versionId: 'v-1', building: true },
		});

		expect(getByTestId('instance-ai-app-building-indicator')).toBeInTheDocument();
	});
});
