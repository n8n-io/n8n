import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentMarkdownChunk from '../components/AgentMarkdownChunk.vue';

const routerPush = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPush }),
}));

describe('AgentMarkdownChunk', () => {
	beforeEach(() => {
		routerPush.mockReset();
	});
	it.each([
		['#agent-build', false],
		['#agent-edit', true],
	] as const)('opens the Test-only Build link %s without navigation', async (href, edit) => {
		const wrapper = mount(AgentMarkdownChunk, {
			props: { source: `[Open Build](${href})`, canOpenBuild: true },
		});
		const event = new MouseEvent('click', { bubbles: true, cancelable: true });
		wrapper.get('a').element.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		expect(wrapper.emitted('open-build')).toEqual([[edit]]);
		expect(routerPush).not.toHaveBeenCalled();
		await wrapper.setProps({ canOpenBuild: false });
		expect(wrapper.find('a').exists()).toBe(false);
		expect(wrapper.text()).toBe('Open Build');
	});

	it('routes legacy agent Preview links to the builder dock', async () => {
		const wrapper = mount(AgentMarkdownChunk, {
			props: {
				source: '[Preview](/projects/project-1/agents/agent-1/preview)',
			},
		});

		await wrapper.find('a').trigger('click');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith(
			'/projects/project-1/agents/agent-1?openPreview=true',
		);
	});

	it('opens agent Preview links in the embedded Instance AI panel', async () => {
		const openAgentChatPreview = vi.fn(() => true);
		const wrapper = mount(AgentMarkdownChunk, {
			props: {
				source: '[Preview](/projects/project-1/agents/agent-1?openPreview=true)',
			},
			global: { provide: { openAgentChatPreview } },
		});

		await wrapper.find('a').trigger('click');

		expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith('agent-1', 'project-1');
		expect(routerPush).not.toHaveBeenCalled();
	});

	it.each([{ metaKey: true }, { ctrlKey: true }])(
		'canonicalizes modifier-click Preview links for the browser',
		async (modifier) => {
			const wrapper = mount(AgentMarkdownChunk, {
				props: {
					source: '[Preview](/projects/project-1/agents/agent-1/preview)',
				},
			});

			const link = wrapper.find('a');
			link.element.addEventListener('click', (event) => event.preventDefault(), { once: true });
			await link.trigger('click', modifier);

			expect(routerPush).not.toHaveBeenCalled();
			expect(link.attributes('href')).toBe('/projects/project-1/agents/agent-1?openPreview=true');
		},
	);
});
