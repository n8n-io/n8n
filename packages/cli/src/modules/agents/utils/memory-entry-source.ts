import type {
	AgentMemoryEntrySourceDto,
	AgentMemoryEntrySourceKind,
	AgentMessageAuthor,
} from '@n8n/api-types';

import type { AgentMessageOrigin } from '../entities/agent-message.entity';
import {
	integrationTypeFromMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
	userIdFromProductionChatMemoryResourceId,
	userIdFromSystemChatMemoryResourceId,
} from './agent-memory-scope';

const INTEGRATION_KINDS = ['slack', 'linear', 'discord', 'telegram', 'whatsapp', 'teams'] as const;

export type IntegrationSourceKind = (typeof INTEGRATION_KINDS)[number];

export function isIntegrationKind(type: string | undefined): type is IntegrationSourceKind {
	return INTEGRATION_KINDS.some((kind) => kind === type);
}

export interface MemorySourceMessage {
	author?: AgentMessageAuthor;
	origin?: AgentMessageOrigin;
}

/** The n8n user that owns a chat resource, with the surface the chat ran on. */
export function chatSourceOwner(
	resourceId: string,
): { kind: AgentMemoryEntrySourceKind; userId: string } | undefined {
	const owners = [
		{ kind: 'preview', userId: userIdFromDraftChatMemoryResourceId(resourceId) },
		{ kind: 'n8n-chat', userId: userIdFromProductionChatMemoryResourceId(resourceId) },
		{ kind: 'build', userId: userIdFromSystemChatMemoryResourceId(resourceId) },
	] as const;
	for (const { kind, userId } of owners) {
		if (userId) return { kind, userId };
	}
	return undefined;
}

function integrationSource(
	message: MemorySourceMessage,
	kind: AgentMemoryEntrySourceKind,
): AgentMemoryEntrySourceDto {
	const integration = message.origin?.integration;
	const source: AgentMemoryEntrySourceDto = { kind };
	if (message.author?.name) source.userName = message.author.name;
	if (integration?.type === 'slack') {
		// The Slack adapter may return the name with its own `#`.
		if (integration.channelName) source.place = `#${integration.channelName.replace(/^#+/, '')}`;
		if (integration.conversationKind === 'dm') source.isDirectMessage = true;
	}
	if (integration?.type === 'linear' && integration.identifier) {
		source.place = integration.identifier;
	}
	return source;
}

/**
 * The source line of a memory entry. A part that is not known is left out.
 * `userNames` maps n8n user ids to display names and `viewerId` is the requesting user.
 */
export function buildMemoryEntrySource(
	resourceId: string,
	message: MemorySourceMessage,
	userNames: ReadonlyMap<string, string>,
	viewerId: string,
): AgentMemoryEntrySourceDto | undefined {
	const integrationKind =
		message.origin?.integration?.type ?? integrationTypeFromMemoryResourceId(resourceId);
	if (isIntegrationKind(integrationKind)) return integrationSource(message, integrationKind);
	const owner = chatSourceOwner(resourceId);
	if (!owner) return undefined;
	const userName = userNames.get(owner.userId);
	return {
		kind: owner.kind,
		...(userName && { userName }),
		...(owner.userId === viewerId && { isViewer: true }),
	};
}
