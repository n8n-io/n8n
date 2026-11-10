import { DEFAULT_AGENT_PERSONALISATION } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import ArtifactCard from '../components/ArtifactCard.vue';

const renderComponent = createComponentRenderer(ArtifactCard, {
	pinia: createTestingPinia(),
});

describe('ArtifactCard', () => {
	it('shows the agent identity icon instead of the normal artifact icon for an agent', async () => {
		const { container, getByTestId } = renderComponent({
			props: {
				type: 'agent',
				name: 'Research agent',
				resourceId: 'agent-1',
			},
		});

		const identityIcon = getByTestId('agent-personalisation-icon-tile');

		await waitFor(() => {
			expect(
				identityIcon.querySelector(`svg[data-icon="${DEFAULT_AGENT_PERSONALISATION.icon}"]`),
			).toBeTruthy();
		});

		expect(container.querySelector('svg[data-icon="robot"]')).not.toBeInTheDocument();
		expect(container).toMatchSnapshot();
	});
});
