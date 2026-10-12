import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure } from '@testing-library/vue';

import AgentChannelTeamsAvailability from './AgentChannelTeamsAvailability.vue';
import { availabilityFrom } from './constants';

configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelTeamsAvailability, {
	pinia: createTestingPinia(),
});

describe('AgentChannelTeamsAvailability', () => {
	it('asks for no file access when only direct chat is on', () => {
		const { queryByTestId } = renderComponent({
			props: { modelValue: availabilityFrom() },
		});

		expect(queryByTestId('teams-file-access')).toBeNull();
	});

	it('links to the app n8n created, so an administrator can grant file access there', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: availabilityFrom({ teamChannels: true }), appId: 'app-1' },
		});

		expect(getByTestId('teams-file-access-link').getAttribute('href')).toContain(
			'/CallAnAPI/appId/app-1',
		);
	});

	it('points to app registrations when the user registered the app', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: availabilityFrom({ groupChats: true }) },
		});

		expect(getByTestId('teams-file-access')).toHaveTextContent('Files.Read.All');
		expect(getByTestId('teams-file-access-link').getAttribute('href')).toContain(
			'ApplicationsListBlade',
		);
	});
});
