import {
	aiPreferenceTargetOf,
	assistantPreferenceCardSchema,
	mergeAssistantPreferenceCard,
	MAX_ASSISTANT_PREFERENCE_CARDS,
	type AssistantPreferenceCard,
	type AssistantPreferenceCardEditRequestDto,
	type AssistantPreferenceCardEditResponse,
	type AssistantPreferenceCardsState,
	type AssistantPreferenceCardUndoRequestDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import { InstanceAiPreferenceCardService } from '../instance-ai-preference-card.service';
import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/** Thread metadata key with the preference cards that the user edited or undid. */
export const ASSISTANT_PREFERENCE_CARDS_METADATA_KEY = 'assistantPreferenceCards';

/** The valid cards of a stored state. A card that an older schema saved is dropped. */
function parseCards(stored: unknown): AssistantPreferenceCardsState {
	if (typeof stored !== 'object' || stored === null) return {};
	const cards: AssistantPreferenceCardsState = {};
	for (const [toolCallId, value] of Object.entries(stored)) {
		const parsed = assistantPreferenceCardSchema.safeParse(value);
		if (parsed.success && parsed.data.toolCallId === toolCallId) cards[toolCallId] = parsed.data;
	}
	return cards;
}

/**
 * The stored cards with `card` merged onto the earlier card of its call. The
 * oldest cards go when the state is full.
 */
export function withCard(
	stored: unknown,
	card: AssistantPreferenceCard,
): AssistantPreferenceCardsState {
	const cards = parseCards(stored);
	const merged = mergeAssistantPreferenceCard(cards[card.toolCallId], card);
	const others = Object.entries(cards).filter(([id]) => id !== card.toolCallId);
	const kept = others.slice(-(MAX_ASSISTANT_PREFERENCE_CARDS - 1));
	return { ...Object.fromEntries(kept), [card.toolCallId]: merged };
}

/**
 * Edit and Undo for the preference card in the Assistant agent chat. The
 * preference writes are the ones of the current Assistant card, so the
 * permissions, the checks and the telemetry are the same. The Agents runtime
 * cannot add a fact to a turn that ended, so the card state goes to the thread
 * metadata, by the id of the `save_user_preference` call.
 *
 * Each method checks access to the thread before it writes the preference.
 * The tool call id is not checked against the thread history: a wrong id can
 * only change how a card renders in the caller's own thread.
 */
@Service()
export class AssistantPreferenceCardsService {
	constructor(
		private readonly threadMetadata: SystemAgentThreadMetadataService,
		private readonly preferenceCards: InstanceAiPreferenceCardService,
	) {}

	/** The cards of a thread that the user edited or undid. */
	async getCards(user: User, threadId: string): Promise<AssistantPreferenceCardsState> {
		return parseCards(await this.readCards(user, threadId));
	}

	async undo(
		user: User,
		threadId: string,
		preferenceId: string,
		{ toolCallId }: AssistantPreferenceCardUndoRequestDto,
	): Promise<AssistantPreferenceCard> {
		await this.readCards(user, threadId);
		await this.preferenceCards.undoRow(user, preferenceId);
		return await this.store(user, threadId, { toolCallId, preferenceId, state: 'undone' });
	}

	async edit(
		user: User,
		threadId: string,
		preferenceId: string,
		{ toolCallId, content, scope, projectId, userId }: AssistantPreferenceCardEditRequestDto,
	): Promise<AssistantPreferenceCardEditResponse> {
		await this.readCards(user, threadId);
		const preference = await this.preferenceCards.editRow(user, preferenceId, {
			content,
			scope,
			projectId,
			userId,
		});
		const card = await this.store(user, threadId, {
			toolCallId,
			preferenceId,
			state: 'edited',
			content: preference.content,
			scope: aiPreferenceTargetOf(preference).scope,
			projectId: preference.projectId,
		});
		return { preference, card };
	}

	/** The stored cards. The read also checks that the user can use the thread. */
	private async readCards(user: User, threadId: string): Promise<unknown> {
		return await this.threadMetadata.read(
			ASSISTANT_AGENT_ID,
			user,
			threadId,
			ASSISTANT_PREFERENCE_CARDS_METADATA_KEY,
		);
	}

	/**
	 * Stores the card after the preference write succeeded, so it never claims a
	 * state the row does not have. Returns the stored card, which keeps the text
	 * and scope of an earlier edit on undo.
	 */
	private async store(
		user: User,
		threadId: string,
		card: AssistantPreferenceCard,
	): Promise<AssistantPreferenceCard> {
		let stored = card;
		await this.threadMetadata.update(
			ASSISTANT_AGENT_ID,
			user,
			threadId,
			ASSISTANT_PREFERENCE_CARDS_METADATA_KEY,
			(current) => {
				const next = withCard(current, card);
				stored = next[card.toolCallId];
				return next;
			},
		);
		return stored;
	}
}
