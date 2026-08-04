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

	it('routes agent Preview links through the current app tab', async () => {
		const wrapper = mount(AgentMarkdownChunk, {
			props: {
				source: '[Preview](/projects/project-1/agents/agent-1/preview)',
			},
		});

		await wrapper.find('a').trigger('click');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith(
			'/projects/project-1/agents/agent-1/preview',
		);
	});

	it('leaves Cmd/Ctrl-click Preview links to the browser', async () => {
		const wrapper = mount(AgentMarkdownChunk, {
			props: {
				source: '[Preview](/projects/project-1/agents/agent-1/preview)',
			},
		});

		await wrapper.find('a').trigger('click', { metaKey: true });

		expect(routerPush).not.toHaveBeenCalled();
	});
});
