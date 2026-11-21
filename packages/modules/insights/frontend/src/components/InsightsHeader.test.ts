import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';

import InsightsHeader from './InsightsHeader.vue';

const renderComponent = createComponentRenderer(InsightsHeader, {
	global: { stubs: { InsightsTabs: true } },
});

const usage = (available: boolean) => ({
	isAvailable: () => available,
	fetchUsage: vi.fn(),
	fetchUsers: vi.fn(),
});

describe('InsightsHeader', () => {
	afterEach(() => {
		capabilityRegistry.clear();
	});

	it('describes the workflow insights when the Assistant tab is not available', () => {
		capabilityRegistry.provide(capabilities.assistantUsage, usage(false));

		const { getByRole, getByTestId } = renderComponent({ pinia: createTestingPinia() });

		expect(getByRole('heading', { level: 2, name: 'Insights' })).toBeInTheDocument();
		expect(getByTestId('insights-subtitle')).toHaveTextContent(
			'Workflow performance on this instance',
		);
	});

	it('mentions the Assistant when its tab is available', () => {
		capabilityRegistry.provide(capabilities.assistantUsage, usage(true));

		const { getByTestId } = renderComponent({ pinia: createTestingPinia() });

		expect(getByTestId('insights-subtitle')).toHaveTextContent(
			'Workflow performance and n8n Assistant usage on this instance',
		);
	});
});
