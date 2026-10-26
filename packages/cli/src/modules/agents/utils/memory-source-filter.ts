import type {
	AgentMemoryEntrySourceKind,
	AgentMemoryFilterSource,
	ListAgentMemoryEntriesQueryDto,
	AgentMemorySourceFacet,
	AgentMemorySourceFacetGroupDto,
	AgentMemorySourceFacetItemDto,
} from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

import type {
	MemoryEntrySourceFilter,
	MemorySourceFacetRow,
	MemorySourceMessageField,
} from '../repositories/agent-memory-entry.repository';
import {
	draftChatMemoryResourceId,
	integrationMemoryResourceId,
	integrationTypeFromMemoryResourceId,
	productionChatMemoryResourceId,
	systemChatMemoryResourceId,
} from './agent-memory-scope';
import {
	chatSourceOwner,
	isIntegrationKind,
	type IntegrationSourceKind,
	type MemorySourceMessage,
} from './memory-entry-source';

type ChatFilterSource = 'users' | 'build';

/** Scope ids of each chat filter source. `users` covers both chat surfaces a person uses. */
const CHAT_RESOURCE_IDS: Record<ChatFilterSource, Array<(userId: string) => string>> = {
	users: [draftChatMemoryResourceId, productionChatMemoryResourceId],
	build: [systemChatMemoryResourceId],
};

/** The filter group of a chat surface: Preview and n8n Chat are both `users`. */
const CHAT_FILTER_SOURCE: Partial<Record<AgentMemoryEntrySourceKind, ChatFilterSource>> = {
	preview: 'users',
	'n8n-chat': 'users',
	build: 'build',
};

/** Facets besides `user` that each integration supports. */
const PLACE_FACETS: Partial<Record<IntegrationSourceKind, 'channel' | 'team'>> = {
	slack: 'channel',
	discord: 'channel',
	linear: 'team',
};

const FACET_MESSAGE_FIELDS: Record<AgentMemorySourceFacet, MemorySourceMessageField> = {
	user: 'authorId',
	channel: 'channelId',
	team: 'teamId',
};

function isChatFilterSource(source: string): source is ChatFilterSource {
	return source in CHAT_RESOURCE_IDS;
}

/**
 * Scope ids of an integration. Older per-user scopes start with `integration:<type>:`.
 * Scopes from `resolveEpisodicScope` start with `<type>:`.
 */
function integrationScopePrefixes(kind: IntegrationSourceKind): string[] {
	return [integrationMemoryResourceId(kind, ''), `${kind}:`];
}

function integrationKindFromResourceId(resourceId: string): IntegrationSourceKind | undefined {
	const kind = integrationTypeFromMemoryResourceId(resourceId) ?? resourceId.split(':')[0];
	return isIntegrationKind(kind) ? kind : undefined;
}

export type MemorySourceSelection = Pick<
	ListAgentMemoryEntriesQueryDto,
	'source' | 'sourceFacet' | 'sourceFacetId'
>;

/** Maps the source selection of the memory list to a repository filter. */
export function toMemoryEntrySourceFilter({
	source,
	sourceFacet,
	sourceFacetId,
}: MemorySourceSelection): MemoryEntrySourceFilter {
	if (!source) {
		if (sourceFacet || sourceFacetId) throw new BadRequestError('A source facet requires a source');
		return {};
	}
	if (!sourceFacet !== !sourceFacetId) {
		throw new BadRequestError('Set both sourceFacet and sourceFacetId, or neither');
	}
	if (isChatFilterSource(source)) return chatSourceFilter(source, sourceFacet, sourceFacetId);
	return integrationSourceFilter(source, sourceFacet, sourceFacetId);
}

function chatSourceFilter(
	source: ChatFilterSource,
	facet: AgentMemorySourceFacet | undefined,
	facetId: string | undefined,
): MemoryEntrySourceFilter {
	const toResourceIds = CHAT_RESOURCE_IDS[source];
	if (!facet || !facetId) return { resourceIdPrefixes: toResourceIds.map((toId) => toId('')) };
	if (facet !== 'user') throw new BadRequestError(`Source "${source}" cannot filter by ${facet}`);
	return { resourceIds: toResourceIds.map((toId) => toId(facetId)) };
}

function integrationSourceFilter(
	kind: IntegrationSourceKind,
	facet: AgentMemorySourceFacet | undefined,
	facetId: string | undefined,
): MemoryEntrySourceFilter {
	if (!facet || !facetId) {
		return { integration: { type: kind, resourceIdPrefixes: integrationScopePrefixes(kind) } };
	}
	if (facet !== 'user' && PLACE_FACETS[kind] !== facet) {
		throw new BadRequestError(`Source "${kind}" cannot filter by ${facet}`);
	}
	return {
		sourceMessage: { integrationType: kind, field: FACET_MESSAGE_FIELDS[facet], value: facetId },
	};
}

function messageFieldValue(
	message: MemorySourceMessage,
	field: MemorySourceMessageField,
): string | undefined {
	const integration = message.origin?.integration;
	if (field === 'authorId') return message.author?.id;
	if (field === 'channelId' && integration && 'channelId' in integration) {
		return integration.channelId;
	}
	if (field === 'teamId' && integration?.type === 'linear') return integration.teamId;
	return undefined;
}

/** Whether a source message matches the message part of the filter, so its row label fits the filter. */
export function sourceMatchesFilter(
	message: MemorySourceMessage,
	filter: MemoryEntrySourceFilter,
): boolean {
	const integrationType = message.origin?.integration?.type;
	if (filter.sourceMessage) {
		const { field, value } = filter.sourceMessage;
		return (
			integrationType === filter.sourceMessage.integrationType &&
			messageFieldValue(message, field) === value
		);
	}
	if (filter.integration) return integrationType === filter.integration.type;
	return true;
}

/** Collects facet items by id. A later row with a name fills in a missing one. */
class FacetItems {
	private readonly items = new Map<string, AgentMemorySourceFacetItemDto>();

	add(id: string | null, name: string | null | undefined, isViewer = false): void {
		if (!id) return;
		const existing = this.items.get(id);
		if (existing?.name) return;
		this.items.set(id, { id, ...(name && { name }), ...(isViewer && { isViewer: true }) });
	}

	list(): AgentMemorySourceFacetItemDto[] {
		return [...this.items.values()].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
	}
}

interface FacetGroupBuilder {
	users: FacetItems;
	places: FacetItems;
}

/**
 * Groups facet rows by source kind. `userNames` maps n8n user ids to display names
 * and `viewerId` is the requesting user.
 */
export function buildMemorySourceFacetGroups(
	rows: MemorySourceFacetRow[],
	userNames: ReadonlyMap<string, string>,
	viewerId: string,
): AgentMemorySourceFacetGroupDto[] {
	const groups = new Map<AgentMemoryFilterSource, FacetGroupBuilder>();
	const groupFor = (kind: AgentMemoryFilterSource) => {
		const group = groups.get(kind) ?? { users: new FacetItems(), places: new FacetItems() };
		groups.set(kind, group);
		return group;
	};
	for (const row of rows) {
		const integrationKind = rowIntegrationKind(row);
		if (integrationKind) {
			addIntegrationRow(groupFor(integrationKind), integrationKind, row);
			continue;
		}
		const owner = chatSourceOwner(row.resourceId);
		const filterSource = owner && CHAT_FILTER_SOURCE[owner.kind];
		if (!owner || !filterSource) continue;
		groupFor(filterSource).users.add(
			owner.userId,
			userNames.get(owner.userId),
			owner.userId === viewerId,
		);
	}
	return [...groups.entries()].map(([kind, group]) => toFacetGroup(kind, group));
}

/** Like the source line, the message decides the integration before the scope id. */
function rowIntegrationKind(row: MemorySourceFacetRow): IntegrationSourceKind | undefined {
	const fromMessage = row.integrationType ?? undefined;
	if (isIntegrationKind(fromMessage)) return fromMessage;
	return integrationKindFromResourceId(row.resourceId);
}

function addIntegrationRow(
	group: FacetGroupBuilder,
	kind: IntegrationSourceKind,
	row: MemorySourceFacetRow,
): void {
	group.users.add(row.authorId, row.authorName);
	const placeFacet = PLACE_FACETS[kind];
	// A direct message is not a channel. The user filter covers it.
	if (placeFacet === 'channel' && row.integrationType === kind && row.conversationKind !== 'dm') {
		group.places.add(row.channelId, row.channelName?.replace(/^#+/, ''));
	}
	if (placeFacet === 'team' && row.integrationType === kind) {
		group.places.add(row.teamId, row.teamName);
	}
}

function toFacetGroup(
	kind: AgentMemoryFilterSource,
	group: FacetGroupBuilder,
): AgentMemorySourceFacetGroupDto {
	const result: AgentMemorySourceFacetGroupDto = { kind, users: group.users.list() };
	const placeFacet = isIntegrationKind(kind) ? PLACE_FACETS[kind] : undefined;
	if (placeFacet === 'channel') result.channels = group.places.list();
	if (placeFacet === 'team') result.teams = group.places.list();
	return result;
}
