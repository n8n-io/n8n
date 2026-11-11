import { Container } from '@n8n/di';

import { KnowledgeSandboxProviderRegistry } from '@/modules/knowledge/knowledge-sandbox-provider-registry';

import { AgentKnowledgeSandboxProvider } from './knowledge-sandbox-provider.adapter';

/** Hands the knowledge module the sandbox its mirror runs in, so that it never imports this module. */
export function registerKnowledgeSandboxProvider(): void {
	Container.get(KnowledgeSandboxProviderRegistry).register(
		Container.get(AgentKnowledgeSandboxProvider),
	);
}
