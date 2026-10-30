import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import CredentialTypeRestrictedMarker from './CredentialTypeRestrictedMarker.vue';

vi.mock('@n8n/frontend-module-type-availability-policies', () => ({
	RestrictedNodePopover: {
		name: 'RestrictedNodePopover',
		props: ['nodeTypeName', 'restriction', 'kind', 'anchor', 'side', 'markerSize'],
		emits: ['contactAdmin'],
		template: "<button @click=\"$emit('contactAdmin', 'project')\" />",
	},
}));

describe('CredentialTypeRestrictedMarker', () => {
	it('anchors the popover to its option row and forwards the contact-admin request with its audience', async () => {
		const onContactAdmin = vi.fn();
		// The class Element Plus gives the root of each select option.
		const Row = defineComponent({
			render: () =>
				h('li', { class: 'el-select-dropdown__item', 'data-test-id': 'row' }, [
					h('div', [
						h(CredentialTypeRestrictedMarker, {
							name: 'Slack API',
							restriction: { name: 'slackApi', available: false, scope: 'project' },
							onContactAdmin,
						}),
					]),
				]),
		});
		const wrapper = mount(Row, { attachTo: document.body });
		await nextTick();

		const popover = wrapper.findComponent({ name: 'RestrictedNodePopover' });
		expect(popover.props()).toMatchObject({
			kind: 'credential',
			side: 'right',
			markerSize: 'xsmall',
			nodeTypeName: 'Slack API',
			restriction: { name: 'slackApi', available: false, scope: 'project' },
			anchor: wrapper.find('[data-test-id="row"]').element,
		});

		await popover.find('button').trigger('click');

		expect(onContactAdmin).toHaveBeenCalledExactlyOnceWith('project');
		wrapper.unmount();
	});
});
