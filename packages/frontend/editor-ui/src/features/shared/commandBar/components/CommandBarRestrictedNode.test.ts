import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import CommandBarRestrictedNode from './CommandBarRestrictedNode.vue';

const requestContactAdmin = vi.hoisted(() => vi.fn());

vi.mock('@n8n/frontend-module-type-availability-policies', async (importOriginal) => ({
	...(await importOriginal<object>()),
	RestrictedNodePopover: {
		name: 'RestrictedNodePopover',
		props: ['nodeTypeName', 'restriction', 'anchor', 'active', 'side', 'align', 'sideOffset'],
		methods: { requestContactAdmin },
		template: '<span />',
	},
}));

function createRow(left: number) {
	const row = document.createElement('div');
	vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: left, width: 700 }));
	document.body.appendChild(row);
	return row;
}

async function render(scope: 'instance' | 'project', rowLeft = 400) {
	const rowElement = createRow(rowLeft);
	const wrapper = mount(CommandBarRestrictedNode, {
		props: {
			nodeTypeName: 'Slack',
			restriction: { name: 'n8n-nodes-base.slack', available: false, scope },
			rowElement,
			isActive: true,
		},
	});
	await nextTick();
	return { wrapper, rowElement };
}

describe('CommandBarRestrictedNode', () => {
	it.each([
		['instance', 'Restricted on this instance'],
		['project', 'Restricted in this project'],
	] as const)('shows the %s scope line', async (scope, label) => {
		const { wrapper } = await render(scope);

		expect(wrapper.find('[data-test-id="command-bar-restriction-scope"]').text()).toBe(label);
	});

	it('anchors the popover to the row and opens it while the row is active', async () => {
		const { wrapper, rowElement } = await render('instance');

		expect(wrapper.findComponent({ name: 'RestrictedNodePopover' }).props()).toMatchObject({
			nodeTypeName: 'Slack',
			restriction: { name: 'n8n-nodes-base.slack', available: false, scope: 'instance' },
			anchor: rowElement,
			active: true,
			side: 'left',
		});
	});

	it('opens the popover below the row when it does not fit to its left', async () => {
		const { wrapper } = await render('instance', 120);

		expect(wrapper.findComponent({ name: 'RestrictedNodePopover' }).props()).toMatchObject({
			side: 'bottom',
			align: 'end',
		});
	});

	it('asks the popover for the contact-admin dialog when its row is activated', async () => {
		const { wrapper } = await render('project');

		(wrapper.vm as unknown as { activate: () => void }).activate();

		expect(requestContactAdmin).toHaveBeenCalledOnce();
	});
});
