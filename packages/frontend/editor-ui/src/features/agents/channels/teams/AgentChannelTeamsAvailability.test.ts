import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent } from '@testing-library/vue';

import AgentChannelTeamsAvailability from './AgentChannelTeamsAvailability.vue';
import { availabilityFrom } from './constants';

const copy = vi.fn();
vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => ({ copy }) }));

configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelTeamsAvailability, {
	pinia: createTestingPinia(),
});

const CONSENT_URL = 'https://login.microsoftonline.com/tenant-1/adminconsent?client_id=app-1';

describe('AgentChannelTeamsAvailability', () => {
	it('asks for no file access when only direct chat is on', () => {
		const { queryByTestId } = renderComponent({
			props: { modelValue: availabilityFrom(), fileAccessConsentUrl: CONSENT_URL },
		});

		expect(queryByTestId('teams-file-access')).toBeNull();
	});

	it('links to the one-step approval for an app n8n created', () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: availabilityFrom({ teamChannels: true }),
				appId: 'app-1',
				fileAccessConsentUrl: CONSENT_URL,
			},
		});

		expect(getByTestId('teams-file-access-link').getAttribute('href')).toBe(CONSENT_URL);
	});

	it("links to the API permissions of the user's own app", () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: availabilityFrom({ groupChats: true }), appId: 'app-1' },
		});

		expect(getByTestId('teams-file-access')).toHaveTextContent('Files.Read.All');
		expect(getByTestId('teams-file-access-link').getAttribute('href')).toContain(
			'/CallAnAPI/appId/app-1',
		);
	});

	it('points to app registrations before a credential is picked', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: availabilityFrom({ groupChats: true }) },
		});

		expect(getByTestId('teams-file-access-link').getAttribute('href')).toContain(
			'ApplicationsListBlade',
		);
	});

	it('copies the link, to send to an administrator', async () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: availabilityFrom({ teamChannels: true }),
				fileAccessConsentUrl: CONSENT_URL,
			},
		});

		await fireEvent.click(getByTestId('teams-file-access-copy'));

		expect(copy).toHaveBeenCalledWith(CONSENT_URL);
	});
});
