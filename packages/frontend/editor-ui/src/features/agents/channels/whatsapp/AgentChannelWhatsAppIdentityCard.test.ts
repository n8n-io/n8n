import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent } from '@testing-library/vue';

import AgentChannelWhatsAppIdentityCard from './AgentChannelWhatsAppIdentityCard.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelWhatsAppIdentityCard);

const PROFILE = {
	verifiedName: 'Acme Support',
	displayPhoneNumber: '+1 555-010-0199',
	description: 'We help',
	profilePictureUrl: 'https://cdn.example.com/a.jpg',
};

// AgentPersonalisationIcon keeps the shared `data-test-id` attribute.
const agentIcon = (container: Element) =>
	container.querySelector('[data-test-id="agent-personalisation-icon-tile"]');

describe('AgentChannelWhatsAppIdentityCard', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('shows the Meta profile', () => {
		const { getByTestId, container } = renderComponent({ props: { profile: PROFILE } });

		expect(getByTestId('whatsapp-identity-name')).toHaveTextContent('Acme Support');
		expect(getByTestId('whatsapp-identity-description')).toHaveTextContent(
			'+1 555-010-0199 · We help',
		);
		expect(getByTestId('whatsapp-identity-avatar')).toHaveAttribute(
			'src',
			PROFILE.profilePictureUrl,
		);
		expect(agentIcon(container)).toBeNull();
	});

	it('leaves out an empty description', () => {
		const { getByTestId } = renderComponent({
			props: { profile: { verifiedName: 'Acme', displayPhoneNumber: '+1 555' } },
		});

		expect(getByTestId('whatsapp-identity-description').textContent?.trim()).toBe('+1 555');
	});

	it('shows a placeholder and the agent icon until the profile is known', () => {
		const { getByTestId, queryByTestId, container } = renderComponent({
			props: { profile: null },
		});

		expect(getByTestId('whatsapp-identity-name')).toHaveTextContent(
			'agents.channels.whatsapp.setup.connect.pendingName',
		);
		expect(getByTestId('whatsapp-identity-description')).toHaveTextContent(
			'agents.channels.whatsapp.setup.connect.pendingProfile',
		);
		expect(queryByTestId('whatsapp-identity-avatar')).toBeNull();
		expect(agentIcon(container)).not.toBeNull();
	});

	it('falls back to the agent icon when the picture fails to load', async () => {
		const { getByTestId, queryByTestId, container, rerender } = renderComponent({
			props: { profile: PROFILE },
		});

		await fireEvent.error(getByTestId('whatsapp-identity-avatar'));

		expect(queryByTestId('whatsapp-identity-avatar')).toBeNull();
		expect(agentIcon(container)).not.toBeNull();

		// A new picture URL gets another try.
		await rerender({ profile: { ...PROFILE, profilePictureUrl: 'https://cdn.example.com/b.jpg' } });

		expect(getByTestId('whatsapp-identity-avatar')).toHaveAttribute(
			'src',
			'https://cdn.example.com/b.jpg',
		);
	});

	it('hides Connect unless asked for', () => {
		const { queryByTestId } = renderComponent({ props: { profile: PROFILE, ready: true } });

		expect(queryByTestId('whatsapp-connect')).toBeNull();
	});

	it('emits connect when ready', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { profile: PROFILE, ready: true, showConnect: true },
		});

		expect(getByTestId('whatsapp-connect')).toBeEnabled();
		await fireEvent.click(getByTestId('whatsapp-connect'));

		expect(emitted().connect).toHaveLength(1);
	});

	it.each([
		{ ready: false, loading: false },
		{ ready: true, loading: true },
	])('disables Connect when ready is $ready and loading is $loading', ({ ready, loading }) => {
		const { getByTestId } = renderComponent({
			props: { profile: PROFILE, ready, loading, showConnect: true },
		});

		expect(getByTestId('whatsapp-connect')).toBeDisabled();
	});

	it('links to WhatsApp Manager in the settings only', () => {
		const { getByTestId, queryByTestId, rerender } = renderComponent({
			props: { profile: PROFILE, showManagerLink: true },
		});

		const link = getByTestId('whatsapp-manager-link');
		expect(link).toHaveAttribute(
			'href',
			'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/',
		);
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveTextContent('agents.channels.whatsapp.settings.editInManager');

		void rerender({ profile: PROFILE, showManagerLink: false });
		return Promise.resolve().then(() => expect(queryByTestId('whatsapp-manager-link')).toBeNull());
	});
});
