import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent } from '@testing-library/vue';
import type { RenderResult } from '@testing-library/vue';

import AgentChannelTeamsAvailability from './AgentChannelTeamsAvailability.vue';
import { availabilityFrom } from './constants';
import { ActionDropdownTestStub } from '../../__tests__/utils/ActionDropdownTestStub';

const copy = vi.fn();
vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => ({ copy }) }));

configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelTeamsAvailability, {
	pinia: createTestingPinia(),
	global: {
		stubs: {
			ActionDropdown: ActionDropdownTestStub,
		},
	},
});

async function openedUrl({ getByTestId }: Pick<RenderResult, 'getByTestId'>) {
	const open = vi.spyOn(window, 'open').mockReturnValue(null);
	await fireEvent.click(getByTestId('teams-file-access-approve'));
	return String(open.mock.calls[0][0]);
}

const CONSENT_URL = 'https://login.microsoftonline.com/tenant-1/adminconsent?client_id=app-1';

describe('AgentChannelTeamsAvailability', () => {
	it('asks for no file access when only direct chat is on', () => {
		const { queryByTestId } = renderComponent({
			props: { modelValue: availabilityFrom(), fileAccessConsentUrl: CONSENT_URL },
		});

		expect(queryByTestId('teams-file-access')).toBeNull();
	});

	it('opens the one-step approval for an app n8n created', async () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: availabilityFrom({ teamChannels: true }),
				appId: 'app-1',
				fileAccessConsentUrl: CONSENT_URL,
			},
		});

		expect(await openedUrl({ getByTestId })).toBe(CONSENT_URL);
	});

	it('opens the approval in the same tab where Microsoft returns to it', async () => {
		const assign = vi.fn();
		vi.stubGlobal('location', { ...window.location, assign });
		const { getByTestId } = renderComponent({
			props: {
				modelValue: availabilityFrom({ teamChannels: true }),
				fileAccessConsentUrl: CONSENT_URL,
				openConsentInPlace: true,
			},
		});

		await fireEvent.click(getByTestId('teams-file-access-approve'));

		expect(assign).toHaveBeenCalledWith(CONSENT_URL);
		vi.unstubAllGlobals();
	});

	it("opens the API permissions of the user's own app", async () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: availabilityFrom({ groupChats: true }), appId: 'app-1' },
		});

		// The portal opens on Delegated permissions, which the agent cannot use.
		expect(getByTestId('teams-file-access')).toHaveTextContent(
			'Files.Read.All application permission',
		);
		expect(await openedUrl({ getByTestId })).toContain('/CallAnAPI/appId/app-1');
	});

	it('opens app registrations before a credential is picked', async () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: availabilityFrom({ groupChats: true }) },
		});

		expect(await openedUrl({ getByTestId })).toContain('ApplicationsListBlade');
	});

	it('confirms an approval only right after Microsoft returns from it', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				modelValue: availabilityFrom({ teamChannels: true }),
				fileAccessConsentUrl: CONSENT_URL,
				fileAccessState: 'approved',
			},
		});

		expect(getByTestId('teams-file-access-approved')).toHaveTextContent('File access approved.');
		expect(queryByTestId('teams-file-access')).toBeNull();
	});

	it('says nothing while the settings hide it', () => {
		const { queryByTestId } = renderComponent({
			props: {
				modelValue: availabilityFrom({ teamChannels: true }),
				fileAccessConsentUrl: CONSENT_URL,
				fileAccessState: 'hidden',
			},
		});

		expect(queryByTestId('teams-file-access')).toBeNull();
		expect(queryByTestId('teams-file-access-approved')).toBeNull();
	});

	it('names the organisation an administrator approves for', () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: availabilityFrom({ teamChannels: true }),
				fileAccessConsentUrl: CONSENT_URL,
				organization: 'Acme Corp',
			},
		});

		expect(getByTestId('teams-file-access')).toHaveTextContent(
			'The agent can’t read files in channels and group chats until an admin approves.',
		);
		expect(getByTestId('teams-file-access-approve')).toHaveTextContent(
			'If you are an admin in Acme Corp',
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
