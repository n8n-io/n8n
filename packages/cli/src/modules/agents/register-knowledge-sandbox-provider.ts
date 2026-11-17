import { Container } from '@n8n/di';

import { KnowledgeSandboxProviderProxy } from '@/modules/knowledge/knowledge-sandbox-provider-proxy';

import { AgentKnowledgeSandboxProvider } from './knowledge-sandbox-provider.adapter';

/** Hands the knowledge module the sandbox its mirror runs in, so that it never imports this module. */
export function registerKnowledgeSandboxProvider(): void {
	Container.get(KnowledgeSandboxProviderProxy).register(
		Container.get(AgentKnowledgeSandboxProvider),
	);
}
