import type {
	AgentJsonLiveSourceConfig,
	AgentJsonLiveSourceItem,
	AgentLiveSourceRetrievalStrategy,
} from '@n8n/api-types';
import type { User } from '@n8n/db';

/**
 * Who the knowledge call runs for. A project agent run reads with the project's
 * credential access. A person run reads with the credential access of that user.
 * The service-account and delegated kinds come later.
 */
export type LivePrincipal = { kind: 'project' } | { kind: 'person'; user: User };

/** A credential reference. The live path never decrypts a credential. */
export interface LiveCredentialRef {
	id: string;
	type: string;
}

/** Everything a provider needs for one call. */
export interface LiveRunContext {
	projectId: string;
	principal: LivePrincipal;
	/** The id of the source in the agent config, for errors and logs. */
	sourceId: string;
	credential: LiveCredentialRef;
	runId: string;
	signal?: AbortSignal;
}

/** A picked item of a live source, as stored in the agent config. */
export type LiveSourceItem = AgentJsonLiveSourceItem;

/** An item a provider returned from `list`, `search` or `resolveLink`. */
export type LiveEntry = LiveSourceItem & {
	icon?: string;
	hasChildren?: boolean;
	updatedAt?: string;
};

/** The parts of a `knowledge://live/<sourceId>/<itemId>` ref. */
export interface LiveEntryRef {
	sourceId: string;
	itemId: string;
}

/** One match that a provider's search returned. The service turns it into a `LiveHit`. */
export interface LiveSearchMatch {
	entry: LiveEntry;
	snippet: string;
	lineRange?: { start: number; end: number };
}

/** One match as the tools return it. */
export interface LiveHit {
	ref: string;
	sourceId: string;
	title: string;
	snippet: string;
	url?: string;
	lineRange?: { start: number; end: number };
	updatedAt?: string;
	retrieval: AgentLiveSourceRetrievalStrategy;
}

/** The text of one item, read live from the source. */
export interface LiveDocument {
	id: string;
	title: string;
	url?: string;
	text: string;
	updatedAt?: string;
	/** True when the source cut the text before it was complete. */
	truncated?: boolean;
	/** The direct children of the item, when it is a container: they join the allow-set. */
	children?: LiveEntry[];
}

export interface LiveListRequest {
	cursor?: string;
	limit?: number;
}

export interface LiveListResult {
	entries: LiveEntry[];
	cursor?: string;
}

export interface LiveSourceCapabilities {
	/** Containers can hold other containers. */
	nestedContainers: boolean;
	/** The provider can search inside a container with its own search API. */
	nativeContainerSearch: boolean;
	/** The provider terms allow a stored copy of the content, for a persisted index. */
	persistableContent: boolean;
}

/**
 * One external service as a knowledge source. A provider maps the four calls to
 * node operations through the `NodeOperationAdapter`. It never touches a
 * credential or the executor directly, and it never returns an item outside the
 * scope it was given.
 */
export interface KnowledgeLiveSourceProvider {
	/** The registry key, the value of `provider` in the agent config. */
	readonly id: string;
	/** The credential types the provider accepts, in order of preference. */
	readonly credentialTypes: readonly string[];
	readonly capabilities: LiveSourceCapabilities;
	readonly defaultRetrieval: AgentLiveSourceRetrievalStrategy;

	/**
	 * The one form of an item id, so that the config, the API and a link in a
	 * document name the same item. Default: the id as it is.
	 */
	normalizeItemId?(id: string): string;

	/** Turns a pasted link into an entry, or `null` when the link is not of this provider. */
	resolveLink(ctx: LiveRunContext, url: string): Promise<LiveEntry | null>;

	/** Lists the direct children of a picked container. */
	list(
		ctx: LiveRunContext,
		container: LiveSourceItem,
		req: LiveListRequest,
	): Promise<LiveListResult>;

	/**
	 * Searches with the provider's own search. `scope` holds every entry the run
	 * may reach: the picked items and the entries that earlier calls discovered.
	 * The result holds only entries in the scope or direct children of a
	 * container in the scope.
	 */
	search(
		ctx: LiveRunContext,
		scope: readonly LiveEntry[],
		query: string,
		limit: number,
	): Promise<LiveSearchMatch[]>;

	/** Reads the text of one entry. */
	read(ctx: LiveRunContext, entry: LiveEntry): Promise<LiveDocument>;
}

/** The config of one live source, as the tools receive it. */
export type LiveSourceConfig = AgentJsonLiveSourceConfig;
