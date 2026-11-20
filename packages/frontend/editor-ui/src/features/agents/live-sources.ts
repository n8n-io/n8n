import type {
	AgentJsonLiveSourceConfig,
	AgentJsonLiveSourceItem,
	AgentLiveSourceRetrievalStrategy,
} from '@n8n/api-types';

export type AgentLiveSourceProviderId = 'notion' | 'slack';

export interface AgentLiveSourceProviderDefinition {
	id: AgentLiveSourceProviderId;
	/** The credential types the backend provider accepts, its preferred one first. */
	credentialTypes: readonly string[];
	/** The strategy the backend uses when the config names none. */
	defaultRetrieval: AgentLiveSourceRetrievalStrategy;
}

/**
 * The live source providers the paste-a-link panel offers. The backend
 * registry (`LiveSourceProviderRegistry`) is the source of truth; this list
 * mirrors its ids, credential types and default strategies until a picker
 * fetches them.
 */
export const AGENT_LIVE_SOURCE_PROVIDERS: readonly AgentLiveSourceProviderDefinition[] = [
	{ id: 'notion', credentialTypes: ['notionOAuth2Api', 'notionApi'], defaultRetrieval: 'native' },
	{ id: 'slack', credentialTypes: ['slackOAuth2Api', 'slackApi'], defaultRetrieval: 'native' },
];

const FALLBACK_RETRIEVAL: AgentLiveSourceRetrievalStrategy = 'native';

/** The strategy a source runs with: the configured one, else its provider's default. */
export function effectiveLiveSourceRetrieval(
	source: Pick<AgentJsonLiveSourceConfig, 'provider' | 'retrieval'>,
): AgentLiveSourceRetrievalStrategy {
	return (
		source.retrieval ??
		getLiveSourceProvider(source.provider)?.defaultRetrieval ??
		FALLBACK_RETRIEVAL
	);
}

export function getLiveSourceProvider(id: string): AgentLiveSourceProviderDefinition | undefined {
	return AGENT_LIVE_SOURCE_PROVIDERS.find((provider) => provider.id === id);
}

const SOURCE_NAME_MAX_LENGTH = 64;

/** The first id of the form `<provider>`, `<provider>-2`, … that no source of the agent uses. */
export function nextLiveSourceId(
	provider: string,
	liveSources: readonly AgentJsonLiveSourceConfig[],
): string {
	const taken = new Set(liveSources.map((source) => source.id));
	if (!taken.has(provider)) return provider;
	let suffix = 2;
	while (taken.has(`${provider}-${suffix}`)) suffix += 1;
	return `${provider}-${suffix}`;
}

export interface ResolvedLiveSourceItem {
	provider: string;
	credential: string;
	/** Names a new source; the provider id is the fallback. */
	credentialName?: string;
	item: AgentJsonLiveSourceItem;
}

/**
 * Adds a resolved item to the source of its provider and credential, or
 * creates that source. `null` when the source already holds the item.
 */
export function addResolvedLiveSourceItem(
	liveSources: readonly AgentJsonLiveSourceConfig[],
	resolved: ResolvedLiveSourceItem,
): AgentJsonLiveSourceConfig[] | null {
	const existing = liveSources.find(
		(source) => source.provider === resolved.provider && source.credential === resolved.credential,
	);
	if (!existing) {
		const name = (resolved.credentialName?.trim() || resolved.provider).slice(
			0,
			SOURCE_NAME_MAX_LENGTH,
		);
		return [
			...liveSources,
			{
				id: nextLiveSourceId(resolved.provider, liveSources),
				provider: resolved.provider,
				name,
				credential: resolved.credential,
				items: [resolved.item],
			},
		];
	}
	if (existing.items.some((item) => item.id === resolved.item.id)) return null;
	return liveSources.map((source) =>
		source === existing ? { ...source, items: [...source.items, resolved.item] } : source,
	);
}

/** Removes an item. A source without items goes with it: sources exist only through their items. */
export function removeLiveSourceItem(
	liveSources: readonly AgentJsonLiveSourceConfig[],
	sourceId: string,
	itemId: string,
): AgentJsonLiveSourceConfig[] {
	return liveSources.flatMap((source) => {
		if (source.id !== sourceId) return [source];
		const items = source.items.filter((item) => item.id !== itemId);
		return items.length > 0 ? [{ ...source, items }] : [];
	});
}

export function removeLiveSource(
	liveSources: readonly AgentJsonLiveSourceConfig[],
	sourceId: string,
): AgentJsonLiveSourceConfig[] {
	return liveSources.filter((source) => source.id !== sourceId);
}

/**
 * Writes the strategy of a source. The provider default is left out of the
 * config, so the backend keeps deciding it; a provider this list does not
 * know gets the strategy written as it is.
 */
export function setLiveSourceRetrieval(
	liveSources: readonly AgentJsonLiveSourceConfig[],
	sourceId: string,
	retrieval: AgentLiveSourceRetrievalStrategy,
): AgentJsonLiveSourceConfig[] {
	return liveSources.map((source) => {
		if (source.id !== sourceId) return source;
		const { retrieval: _previous, ...rest } = source;
		const isProviderDefault =
			getLiveSourceProvider(source.provider)?.defaultRetrieval === retrieval;
		return isProviderDefault ? rest : { ...rest, retrieval };
	});
}
