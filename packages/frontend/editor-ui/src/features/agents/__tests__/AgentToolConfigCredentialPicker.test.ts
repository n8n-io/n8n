import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

import AgentToolConfigCredentialPicker from '../components/AgentToolConfigCredentialPicker.vue';

const openPicker = vi.fn();

const ToolCredentialPickerStub = defineComponent({
	props: {
		showConnectedIcon: Boolean,
	},
	emits: ['select-credential'],
	setup(_, { expose }) {
		expose({ open: openPicker });
		return {};
	},
	template: `<button
		data-testid="pick"
		:data-show-connected-icon="showConnectedIcon"
		@click="$emit('select-credential', {}, 'githubOAuth2Api', 'credential-1')"
	/>`,
});

describe('AgentToolConfigCredentialPicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('opens the child picker and emits the selected credential without the item argument', async () => {
		const wrapper = mount(AgentToolConfigCredentialPicker, {
			props: {
				item: {
					id: 'registry-config:github',
					kind: 'mcp-server',
					title: 'GitHub',
					status: 'connected',
					availableTools: [],
					credentials: [{ authType: 'githubOAuth2Api' }],
				},
				adapter: null,
				showConnectedIcon: false,
			},
			global: {
				stubs: { ToolCredentialPicker: ToolCredentialPickerStub },
			},
		});

		(wrapper.vm as unknown as { open: () => void }).open();
		expect(openPicker).toHaveBeenCalledOnce();
		expect(wrapper.get('[data-testid="pick"]').attributes('data-show-connected-icon')).toBe(
			'false',
		);
		await wrapper.setProps({ showConnectedIcon: true });
		expect(wrapper.get('[data-testid="pick"]').attributes('data-show-connected-icon')).toBe('true');

		await wrapper.get('[data-testid="pick"]').trigger('click');
		expect(wrapper.emitted('select-credential')).toEqual([['githubOAuth2Api', 'credential-1']]);
	});
});
