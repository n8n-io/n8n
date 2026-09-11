import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { AgentChatBlock } from '@n8n/api-types';

import type { BlockRenderContext } from '../../types';
import { agentChatBlockRenderer } from '../agent-chat.renderer';

const ctx: BlockRenderContext = {
	app: {
		id: 'app-1',
		name: 'My App',
		namespace: 'my-app',
		projectId: 'project-1',
		theme: null,
		components: null,
	},
	page: { id: 'page-1', route: ':id', path: '/apps/my-app/clients/42' },
	actionPageId: 'owner-page',
	menu: [],
	params: { id: '42' },
	query: {},
	viewer: null,
	baseUrl: 'https://n8n.example.com',
	preview: false,
};

const block: AgentChatBlock = {
	id: 'chat-1',
	type: 'agent-chat',
	data: {
		agentId: 'agent-1',
		welcome: 'Hi <b>there</b> & welcome',
		placeholder: 'Ask "anything"',
	},
};

const setAgentsModule = (active: boolean) =>
	Container.set(ModuleRegistry, mock<ModuleRegistry>({ isActive: () => active }));

describe('agentChatBlockRenderer', () => {
	it('renders the widget with the chat URL of the owning page and the widget script', async () => {
		setAgentsModule(true);

		const html = await agentChatBlockRenderer.render(block, ctx);

		expect(html).toContain(
			"data-chat-url='https://n8n.example.com/apps/my-app/_agents/owner-page/chat-1/chat'",
		);
		expect(html).toContain("<script src='https://n8n.example.com/apps/_static/app-chat.js' defer>");
		expect(html).toContain("<form class='app-chat-form'>");
	});

	it('escapes welcome and placeholder', async () => {
		setAgentsModule(true);

		const html = await agentChatBlockRenderer.render(block, ctx);

		expect(html).toContain('Hi &lt;b&gt;there&lt;/b&gt; &amp; welcome');
		expect(html).not.toContain('<b>there</b>');
		expect(html).toContain("placeholder='Ask &quot;anything&quot;'");
	});

	it('renders no welcome bubble and a default placeholder when both are absent', async () => {
		setAgentsModule(true);

		const html = await agentChatBlockRenderer.render(
			{ ...block, data: { agentId: 'agent-1' } },
			ctx,
		);

		expect(html).not.toContain('app-chat-bubble--assistant');
		expect(html).toContain("placeholder='Type a message'");
	});

	it('renders a muted notice without the widget when the agents module is inactive', async () => {
		setAgentsModule(false);

		const html = await agentChatBlockRenderer.render(block, ctx);

		expect(html).toContain('Chat is not available on this instance.');
		expect(html).not.toContain('data-app-chat');
		expect(html).not.toContain('<script');
	});
});
