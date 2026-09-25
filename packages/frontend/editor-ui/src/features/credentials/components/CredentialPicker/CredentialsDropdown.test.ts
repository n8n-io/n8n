import { N8nSelect } from '@n8n/design-system';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import CredentialsDropdown from './CredentialsDropdown.vue';

const MANAGED_OPTION = {
	value: 'managed',
	label: 'Gateway credits',
	pill: { text: '100', type: 'default' as const },
};

const CREDENTIAL_OPTION = {
	id: 'cred-1',
	name: 'My OpenAI',
	typeDisplayName: 'OpenAI',
};

const managedTestId = `node-credentials-select-item-${MANAGED_OPTION.value}`;

function renderComponent() {
	return mount(CredentialsDropdown, {
		global: { plugins: [createTestingPinia()] },
		props: {
			credentialOptions: [CREDENTIAL_OPTION],
			selectedCredentialId: null,
			permissions: { create: true },
			managedOption: MANAGED_OPTION,
		},
	});
}

describe('CredentialsDropdown', () => {
	it('resets the filter when the dropdown closes so the managed row shows on reopen', async () => {
		const wrapper = renderComponent();
		const select = wrapper.findComponent(N8nSelect);

		// Managed row is visible with no filter.
		expect(wrapper.find(`[data-test-id="${managedTestId}"]`).exists()).toBe(true);

		// A non-matching filter hides the managed row.
		const filterMethod = select.props('filterMethod') as (query: string) => void;
		filterMethod('zzz');
		await nextTick();
		expect(wrapper.find(`[data-test-id="${managedTestId}"]`).exists()).toBe(false);

		// Closing the dropdown must clear the leftover filter.
		select.vm.$emit('visible-change', false);
		await nextTick();
		expect(wrapper.find(`[data-test-id="${managedTestId}"]`).exists()).toBe(true);
	});
});
