import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'openai-codex-oauth' })
export class OpenAiCodexOAuthModule implements ModuleInterface {
	async init() {
		await import('./openai-codex-oauth.controller.js');

		// Lets the agents runtime upgrade Codex requests to a WebSocket through
		// this instance's guarded transport; without it that path stays on SSE.
		const { registerCodexSocketFactory } = await import('./codex-socket-factory.js');
		registerCodexSocketFactory();
	}

	@OnShutdown()
	async shutdown() {
		const { closeCodexWebSockets, setCodexSocketFactory } = await import('@n8n/agents');
		setCodexSocketFactory(undefined);
		closeCodexWebSockets();

		const { OpenAiCodexOAuthService } = await import('./openai-codex-oauth.service.js');
		Container.get(OpenAiCodexOAuthService).shutdown();
	}
}
