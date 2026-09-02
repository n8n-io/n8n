import { mount } from '@vue/test-utils';

import CredentialStatusStrip from '../components/CredentialStatusStrip.vue';
import type { CredentialStatus } from '../types';

const i18n: Record<string, string> = {
	credentialStatusMissingAccount: 'Connect 1 account to start chatting',
	credentialStatusMissingAccounts: 'Connect {count} accounts to start chatting',
	credentialStatusTestMode: "You're testing with your own connected accounts.",
};

vi.mock('@n8n/chat/composables', () => ({
	useI18n: () => ({
		t: (key: string) => i18n[key] ?? key,
	}),
}));

function mountStrip(status: CredentialStatus) {
	return mount(CredentialStatusStrip, { props: { status } });
}

describe('CredentialStatusStrip', () => {
	it('renders the singular message for exactly one missing account', () => {
		const wrapper = mountStrip({ ready: false, missingCount: 1, testMode: false });

		expect(wrapper.text()).toBe('Connect 1 account to start chatting');
	});

	it('renders the plural message with the interpolated count for multiple missing accounts', () => {
		const wrapper = mountStrip({ ready: false, missingCount: 3, testMode: false });

		expect(wrapper.text()).toBe('Connect 3 accounts to start chatting');
	});

	it('renders the test-mode message regardless of the missing count', () => {
		const wrapper = mountStrip({ ready: true, missingCount: 0, testMode: true });

		expect(wrapper.text()).toBe("You're testing with your own connected accounts.");
	});
});
