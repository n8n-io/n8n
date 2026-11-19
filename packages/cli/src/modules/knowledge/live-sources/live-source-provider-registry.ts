import { Service } from '@n8n/di';

import { LiveSourceUnknownProviderError } from './live-source.errors';
import type { KnowledgeLiveSourceProvider } from './live-source-provider';
import { NotionLiveSourceProvider } from './providers/notion.provider';
import { SlackLiveSourceProvider } from './providers/slack.provider';

/**
 * The live source providers by id. The built-in providers come in through the
 * constructor. `provider` in the agent config is an open string; this registry
 * is what validates it.
 */
@Service()
export class LiveSourceProviderRegistry {
	private readonly providers = new Map<string, KnowledgeLiveSourceProvider>();

	constructor(notion: NotionLiveSourceProvider, slack: SlackLiveSourceProvider) {
		this.register(notion);
		this.register(slack);
	}

	register(provider: KnowledgeLiveSourceProvider): void {
		this.providers.set(provider.id, provider);
	}

	/** Throws `LiveSourceUnknownProviderError` when no provider has this id. */
	get(id: string): KnowledgeLiveSourceProvider {
		const provider = this.providers.get(id);
		if (!provider) throw new LiveSourceUnknownProviderError(id);
		return provider;
	}

	list(): KnowledgeLiveSourceProvider[] {
		return [...this.providers.values()];
	}
}
