import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

/** The partial carries its own `<script>`, so the widget also initialises after an in-place navigation. */
export const agentChatBlockRenderer: BlockRenderer<'agent-chat'> = {
	type: 'agent-chat',
	async render(block, ctx) {
		return await renderPartial('block-agent-chat', {
			available: Container.get(ModuleRegistry).isActive('agents'),
			chatUrl: `${ctx.baseUrl}/apps/${ctx.app.namespace}/_agents/${ctx.actionPageId}/${block.id}/chat`,
			scriptHref: `${ctx.baseUrl}/apps/_static/app-chat.js`,
			welcome: block.data.welcome,
			placeholder: block.data.placeholder ?? 'Type a message',
		});
	},
};
