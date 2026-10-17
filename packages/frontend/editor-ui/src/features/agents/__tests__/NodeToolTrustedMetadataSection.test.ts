import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

import NodeToolTrustedMetadata from '../components/NodeToolTrustedMetadata.vue';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const ParameterInputStub = defineComponent({
	props: ['value', 'inputMode', 'isReadOnly', 'path'],
	emits: ['update', 'text-input', 'update:input-mode'],
	template: '<div data-test-id="param-stub" :data-read-only="String(isReadOnly)" />',
});

function render(props: Record<string, unknown>) {
	return mount(NodeToolTrustedMetadata, {
		props: { toolName: 'tool', ...props },
		global: {
			plugins: [createTestingPinia({ stubActions: false })],
			stubs: { ParameterInputFull: ParameterInputStub },
		},
	});
}

const params = { url: '={{ $json.dashboard_url }}/x', body: '={{ $json.token }}' };

function lastModel(wrapper: ReturnType<typeof render>) {
	const events = wrapper.emitted('update:modelValue') ?? [];
	return events[events.length - 1]?.[0];
}

describe('NodeToolTrustedMetadata', () => {
	it('renders one read-only row per detected variable without add or remove controls', () => {
		const wrapper = render({ nodeParameters: params });
		const names = wrapper.findAll('[data-test-id="agent-trusted-metadata-name"]');
		expect(names.map((n) => n.text())).toEqual(['dashboard_url', 'token']);
		expect(wrapper.find('input[name="trustedMetadataName"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-trusted-metadata-add"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-trusted-metadata-remove"]').exists()).toBe(false);
		expect(wrapper.findAll('button')).toHaveLength(0);
	});

	it('does not render rows for names the wire schema rejects', () => {
		const long = 'a'.repeat(64);
		const wrapper = render({
			nodeParameters: { url: `={{ $json.ok }}/{{ $json.${long} }}` },
		});
		const names = wrapper.findAll('[data-test-id="agent-trusted-metadata-name"]');
		expect(names.map((n) => n.text())).toEqual(['ok']);
	});

	it('is hidden when no variables are detected', () => {
		const wrapper = render({ nodeParameters: { url: 'https://x.test' } });
		expect(wrapper.find('[data-test-id="agent-node-tool-trusted-metadata"]').exists()).toBe(false);
	});

	it('emits a record with only non-empty defaults when a default is edited', async () => {
		const wrapper = render({ nodeParameters: params });
		const inputs = wrapper.findAllComponents(ParameterInputStub);
		inputs[0].vm.$emit('update', { value: 'https://dash.test' });
		await wrapper.vm.$nextTick();
		expect(lastModel(wrapper)).toEqual({
			dashboard_url: { mode: 'fixed', value: 'https://dash.test' },
		});
	});

	it('removes the entry when the default is cleared', async () => {
		const wrapper = render({
			nodeParameters: params,
			modelValue: { token: { mode: 'fixed', value: 'abc' } },
		});
		const inputs = wrapper.findAllComponents(ParameterInputStub);
		expect(inputs[1].props('value')).toBe('abc');
		inputs[1].vm.$emit('update', { value: '' });
		await wrapper.vm.$nextTick();
		expect(lastModel(wrapper)).toBeUndefined();
	});

	it('emits expression defaults', async () => {
		const wrapper = render({ nodeParameters: params });
		const input = wrapper.findAllComponents(ParameterInputStub)[0];
		input.vm.$emit('update:input-mode', 'expression');
		await wrapper.vm.$nextTick();
		wrapper.findAllComponents(ParameterInputStub)[0].vm.$emit('update', { value: '={{ $now }}' });
		await wrapper.vm.$nextTick();
		expect(lastModel(wrapper)).toEqual({
			dashboard_url: { mode: 'expression', value: '={{ $now }}' },
		});
	});

	it('drops stale defaults and follows parameter changes', async () => {
		const wrapper = render({
			nodeParameters: params,
			modelValue: {
				token: { mode: 'fixed', value: 'abc' },
				gone: { mode: 'fixed', value: 'x' },
			},
		});
		expect(lastModel(wrapper)).toEqual({ token: { mode: 'fixed', value: 'abc' } });
		await wrapper.setProps({
			nodeParameters: { url: '={{ $json.other }}' },
			modelValue: undefined,
		});
		const names = wrapper.findAll('[data-test-id="agent-trusted-metadata-name"]');
		expect(names.map((n) => n.text())).toEqual(['other']);
	});

	it('passes read-only to the inputs and ignores edits when disabled', async () => {
		const wrapper = render({ nodeParameters: params, disabled: true });
		const input = wrapper.findAllComponents(ParameterInputStub)[0];
		expect(input.props('isReadOnly')).toBe(true);
		input.vm.$emit('update', { value: 'x' });
		await wrapper.vm.$nextTick();
		expect(lastModel(wrapper)).toBeUndefined();
	});
});
