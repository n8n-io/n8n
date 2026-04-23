/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import AgentSectionEditor from '../components/AgentSectionEditor.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

describe('AgentSectionEditor', () => {
	it('mounts with a serialized JSON doc derived from the config prop', async () => {
		const wrapper = mount(AgentSectionEditor, {
			props: { config: { model: { provider: 'openai' } } },
		});
		await nextTick();
		const text = wrapper.element.querySelector('.cm-content')?.textContent ?? '';
		expect(text).toContain('"model"');
		expect(text).toContain('"provider"');
	});

	it('exposes a container with the expected testid', () => {
		const wrapper = mount(AgentSectionEditor, { props: { config: {} } });
		expect(wrapper.find('[data-testid="agent-section-editor"]').exists()).toBe(true);
	});

	it('renders an empty editor when config is null', async () => {
		const wrapper = mount(AgentSectionEditor, { props: { config: null } });
		await nextTick();
		expect(wrapper.find('[data-testid="agent-section-editor"]').exists()).toBe(true);
	});
});
