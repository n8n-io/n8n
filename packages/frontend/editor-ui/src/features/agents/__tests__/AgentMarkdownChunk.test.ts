import { AGENT_BUILDER_STANDALONE_KEY } from '../components/agentBuilderInjectionKeys';
import {
	AGENT_CHAT_MARKDOWN_HOST_KEY,
	type AgentChatMarkdownHost,
} from '../components/agentChatInjectionKeys';
import { flushPromises, mount } from '@vue/test-utils';
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
	it('opens agent Preview links outside the standalone Agents UI through the provider', async () => {
		const openAgentChatPreview = vi.fn(() => true);
		const wrapper = mount(AgentMarkdownChunk, {
			props: { source: '[Preview](/projects/p1/agents/a1/preview)' },
			global: { provide: { openAgentChatPreview } },
		});
		let prevented: boolean | undefined;
		wrapper.element.addEventListener('click', (event: Event) => {
			prevented = event.defaultPrevented;
			event.preventDefault();
		});
		await wrapper.get('a').trigger('click');
		expect(prevented).toBe(true);
		expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith('a1', 'p1');
		expect(routerPush).not.toHaveBeenCalled();
		expect(wrapper.get('a').attributes('href')).toBe('/projects/p1/agents/a1?openPreview=true');
	});

	it('opens a link to a resource of the host in the host preview', async () => {
		const openWorkflowPreview = vi.fn(() => true);
		const host: AgentChatMarkdownHost = {
			resources: () => [{ type: 'workflow', id: 'w1', name: 'Weekly report' }],
			linkableResources: () => [],
			artifactLinks: {
				artifactHref: (_type, id) => `/workflow/${id}`,
				routerPathHref: (path) => path,
				toRouterPath: (href) => ({ pathname: href, fullPath: href }),
			},
		};
		const wrapper = mount(AgentMarkdownChunk, {
			props: { source: '[Weekly report](/workflow/w1)' },
			global: {
				provide: { openWorkflowPreview, [AGENT_CHAT_MARKDOWN_HOST_KEY as symbol]: host },
			},
		});
		// The markdown renders its resource links after it mounts.
		await flushPromises();
		let prevented: boolean | undefined;
		wrapper.element.addEventListener('click', (event: Event) => {
			prevented = event.defaultPrevented;
			event.preventDefault();
		});
		await wrapper.get('a').trigger('click');
		expect(prevented).toBe(true);
		expect(openWorkflowPreview).toHaveBeenCalledExactlyOnceWith('w1');
	});

	it('routes agent Preview links outside the standalone Agents UI without a provider', async () => {
		const wrapper = mount(AgentMarkdownChunk, {
			props: { source: '[Preview](/projects/p1/agents/a1/preview)' },
		});
		await wrapper.get('a').trigger('click');
		expect(routerPush).toHaveBeenCalledExactlyOnceWith('/projects/p1/agents/a1?openPreview=true');
	});

	it.each(['#agent-build', '#agent-edit'])(
		'keeps %s as a native link outside the standalone Agents UI',
		async (href) => {
			const wrapper = mount(AgentMarkdownChunk, {
				props: { source: `[Build](${href})`, canOpenBuild: true },
			});
			let prevented: boolean | undefined;
			wrapper.element.addEventListener('click', (event: Event) => {
				prevented = event.defaultPrevented;
				event.preventDefault();
			});
			await wrapper.get('a').trigger('click');
			expect(prevented).toBe(false);
			expect(wrapper.emitted('open-build')).toBeUndefined();
			expect(routerPush).not.toHaveBeenCalled();
			expect(wrapper.get('a').attributes('href')).toBe(href);
		},
	);

	it.each([
		['#agent-build', false],
		['#agent-edit', true],
	] as const)('opens the Test-only Build link %s without navigation', async (href, edit) => {
		const wrapper = mount(AgentMarkdownChunk, {
			global: { provide: { [AGENT_BUILDER_STANDALONE_KEY as symbol]: true } },
			props: { source: `[Open Build](${href})`, canOpenBuild: true },
		});
		const prevented = vi.fn();
		wrapper.element.addEventListener('click', (event: Event) => prevented(event.defaultPrevented));
		await wrapper.get('a').trigger('click');
		expect(prevented).toHaveBeenCalledExactlyOnceWith(true);
		expect(wrapper.emitted('open-build')).toEqual([[edit]]);
		expect(routerPush).not.toHaveBeenCalled();
		await wrapper.setProps({ canOpenBuild: false });
		expect(wrapper.find('a').exists()).toBe(false);
		expect(wrapper.text()).toBe('Open Build');
	});

	it('routes legacy agent Preview links to the builder dock', async () => {
		const wrapper = mount(AgentMarkdownChunk, {
			global: { provide: { [AGENT_BUILDER_STANDALONE_KEY as symbol]: true } },
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
			global: { provide: { openAgentChatPreview, [AGENT_BUILDER_STANDALONE_KEY as symbol]: true } },
		});

		await wrapper.find('a').trigger('click');

		expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith('agent-1', 'project-1');
		expect(routerPush).not.toHaveBeenCalled();
	});

	it.each([{ metaKey: true }, { ctrlKey: true }])(
		'keeps master modifier-click handling outside the standalone Agents UI: %o',
		async (modifier) => {
			const openAgentChatPreview = vi.fn(() => true);
			const wrapper = mount(AgentMarkdownChunk, {
				props: { source: '[Preview](/projects/p1/agents/a1/preview)' },
				global: { provide: { openAgentChatPreview } },
			});
			await wrapper.get('a').trigger('click', modifier);
			expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith('a1', 'p1');
			expect(routerPush).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ metaKey: true, embedded: false, standalone: true },
		{ ctrlKey: true, embedded: false, standalone: true },
		{ metaKey: true, embedded: true, standalone: true },
		{ ctrlKey: true, embedded: true, standalone: true },
		{ metaKey: true, embedded: false, standalone: false },
		{ ctrlKey: true, embedded: false, standalone: false },
	])(
		'preserves modifier-click navigation with provider $embedded in standalone $standalone',
		async ({ embedded, standalone, ...modifier }) => {
			const openAgentChatPreview = vi.fn(() => true);
			const wrapper = mount(AgentMarkdownChunk, {
				props: { source: '[Preview](/projects/project-1/agents/agent-1/preview)' },
				global: {
					provide: {
						...(embedded ? { openAgentChatPreview } : {}),
						[AGENT_BUILDER_STANDALONE_KEY as symbol]: standalone,
					},
				},
			});
			const link = wrapper.get('a');
			let prevented: boolean | undefined;
			wrapper.element.addEventListener(
				'click',
				(event: Event) => {
					prevented = event.defaultPrevented;
					event.preventDefault();
				},
				{ once: true },
			);
			await link.trigger('click', modifier);
			expect(prevented).toBe(false);
			expect(openAgentChatPreview).not.toHaveBeenCalled();
			expect(routerPush).not.toHaveBeenCalled();
			expect(link.attributes('href')).toBe('/projects/project-1/agents/agent-1?openPreview=true');
		},
	);
});
