import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import ModelSelectorRestrictedMarker from '../components/model-selector/ModelSelectorRestrictedMarker.vue';

vi.mock('@n8n/frontend-module-type-availability-policies', () => ({
	RestrictedNodePopover: {
		name: 'RestrictedNodePopover',
		props: ['nodeTypeName', 'scope', 'kind', 'anchor', 'side', 'markerSize'],
		emits: ['contactAdmin'],
		template: '<button @click="$emit(\'contactAdmin\')" />',
	},
}));

describe('ModelSelectorRestrictedMarker', () => {
	it('anchors the popover to its menu row and forwards the contact-admin request', async () => {
		const onContactAdmin = vi.fn();
		const Row = defineComponent({
			render: () =>
				h('div', { role: 'menuitem', 'data-test-id': 'row' }, [
					h(ModelSelectorRestrictedMarker, {
						name: 'Anthropic credentials',
						scope: 'instance',
						onContactAdmin,
					}),
				]),
		});
		const wrapper = mount(Row, { attachTo: document.body });
		await nextTick();

		const popover = wrapper.findComponent({ name: 'RestrictedNodePopover' });
		expect(popover.props()).toMatchObject({
			kind: 'credential',
			side: 'right',
			markerSize: 'xsmall',
			nodeTypeName: 'Anthropic credentials',
			scope: 'instance',
			anchor: wrapper.find('[data-test-id="row"]').element,
		});

		await popover.find('button').trigger('click');

		expect(onContactAdmin).toHaveBeenCalledOnce();
		wrapper.unmount();
	});
});
