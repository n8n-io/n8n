import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { ref, computed, defineComponent, h } from 'vue';
import type { SimplifiedNodeType } from '@/Interface';

const useNodeIconSourceMock = vi.fn();

vi.mock('@/app/composables/useNodeIconSource', () => ({
	useNodeIconSource: (...args: unknown[]) => {
		useNodeIconSourceMock(...args);
		return computed(() => undefined);
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nNodeIcon: defineComponent({
		props: ['type', 'src', 'name', 'disabled', 'size', 'circle'],
		setup() {
			return () => h('div', { class: 'stubbed-node-icon' });
		},
	}),
}));

import NodeIcon from './NodeIcon.vue';

const setNodeType: SimplifiedNodeType = {
	name: 'n8n-nodes-base.set',
	displayName: 'Edit Fields',
	description: '',
	group: ['input'],
	defaults: {},
	outputs: [],
};

const calendarNodeType: SimplifiedNodeType = {
	name: 'n8n-nodes-base.googleCalendar',
	displayName: 'Google Calendar',
	description: '',
	group: ['input'],
	defaults: {},
	outputs: [],
};

describe('NodeIcon.vue', () => {
	it('passes reactive getters to useNodeIconSource so the icon refreshes when the nodeType prop changes', () => {
		useNodeIconSourceMock.mockClear();

		const nodeTypeRef = ref<SimplifiedNodeType>(setNodeType);

		mount(NodeIcon, {
			global: {
				plugins: [createTestingPinia({ stubActions: false })],
			},
			props: {
				nodeType: nodeTypeRef.value,
			},
		});

		expect(useNodeIconSourceMock).toHaveBeenCalledTimes(1);
		const [nodeTypeArg, nodeArg] = useNodeIconSourceMock.mock.calls[0];

		expect(typeof nodeTypeArg).toBe('function');
		expect(typeof nodeArg).toBe('function');
	});

	it('the nodeType getter passed to useNodeIconSource reflects the latest prop value', async () => {
		useNodeIconSourceMock.mockClear();

		const wrapper = mount(NodeIcon, {
			global: {
				plugins: [createTestingPinia({ stubActions: false })],
			},
			props: {
				nodeType: setNodeType,
			},
		});

		const [nodeTypeGetter] = useNodeIconSourceMock.mock.calls[0];
		expect((nodeTypeGetter as () => SimplifiedNodeType)()).toEqual(setNodeType);

		await wrapper.setProps({ nodeType: calendarNodeType });

		expect((nodeTypeGetter as () => SimplifiedNodeType)()).toEqual(calendarNodeType);
	});
});
