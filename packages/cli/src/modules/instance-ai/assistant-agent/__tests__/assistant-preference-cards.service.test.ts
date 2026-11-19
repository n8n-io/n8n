import {
	MAX_ASSISTANT_PREFERENCE_CARDS,
	type AiPreferenceDto,
	type AssistantPreferenceCard,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import type { InstanceAiPreferenceCardService } from '../../instance-ai-preference-card.service';
import {
	ASSISTANT_PREFERENCE_CARDS_METADATA_KEY,
	AssistantPreferenceCardsService,
	withCard,
} from '../assistant-preference-cards.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

const THREAD_ID = 'thread-1';

describe('AssistantPreferenceCardsService', () => {
	const threadMetadata = mock<SystemAgentThreadMetadataService>();
	const preferenceCards = mock<InstanceAiPreferenceCardService>();
	const service = new AssistantPreferenceCardsService(threadMetadata, preferenceCards);
	const user = mock<User>({ id: 'user-1' });

	/** The stored value of the cards key. `update` applies the change the way the real service does. */
	let stored: unknown;

	beforeEach(() => {
		vi.clearAllMocks();
		stored = undefined;
		threadMetadata.read.mockImplementation(async () => stored);
		threadMetadata.update.mockImplementation(async (_agentId, _user, _threadId, _key, change) => {
			const next = change(stored);
			if (next !== undefined) stored = next;
		});
	});

	describe('getCards', () => {
		it('reads the cards key of the Assistant agent thread for the user', async () => {
			const card: AssistantPreferenceCard = {
				toolCallId: 'tc-1',
				preferenceId: 'pref-1',
				state: 'undone',
			};
			stored = { 'tc-1': card };

			await expect(service.getCards(user, THREAD_ID)).resolves.toEqual({ 'tc-1': card });
			expect(threadMetadata.read).toHaveBeenCalledWith(
				ASSISTANT_AGENT_ID,
				user,
				THREAD_ID,
				ASSISTANT_PREFERENCE_CARDS_METADATA_KEY,
			);
		});

		it('returns no cards when none are stored', async () => {
			await expect(service.getCards(user, THREAD_ID)).resolves.toEqual({});
		});

		it('drops stored cards with an invalid shape or a key of another call', async () => {
			stored = {
				'tc-1': { toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'gone' },
				'tc-2': { toolCallId: 'tc-3', preferenceId: 'pref-2', state: 'undone' },
				'tc-4': { toolCallId: 'tc-4', preferenceId: 'pref-4', state: 'undone' },
			};

			await expect(service.getCards(user, THREAD_ID)).resolves.toEqual({
				'tc-4': { toolCallId: 'tc-4', preferenceId: 'pref-4', state: 'undone' },
			});
		});
	});

	describe('undo', () => {
		it('deletes the row, then stores an undone card', async () => {
			const card = await service.undo(user, THREAD_ID, 'pref-1', { toolCallId: 'tc-1' });

			expect(card).toEqual({ toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'undone' });
			expect(preferenceCards.undoRow).toHaveBeenCalledWith(user, 'pref-1');
			expect(stored).toEqual({ 'tc-1': card });
		});

		it('returns the stored card, which keeps the text of an earlier edit', async () => {
			stored = {
				'tc-1': {
					toolCallId: 'tc-1',
					preferenceId: 'pref-1',
					state: 'edited',
					content: 'Two sticky notes.',
					scope: 'user',
					projectId: null,
				},
			};

			const card = await service.undo(user, THREAD_ID, 'pref-1', { toolCallId: 'tc-1' });

			expect(card).toEqual({
				toolCallId: 'tc-1',
				preferenceId: 'pref-1',
				state: 'undone',
				content: 'Two sticky notes.',
				scope: 'user',
				projectId: null,
			});
			expect(stored).toEqual({ 'tc-1': card });
		});

		it('checks the thread before it deletes the row', async () => {
			threadMetadata.read.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(service.undo(user, THREAD_ID, 'pref-1', { toolCallId: 'tc-1' })).rejects.toThrow(
				NotFoundError,
			);
			expect(preferenceCards.undoRow).not.toHaveBeenCalled();
		});

		it('stores nothing when the delete fails', async () => {
			preferenceCards.undoRow.mockRejectedValue(new ForbiddenError('No'));

			await expect(service.undo(user, THREAD_ID, 'pref-1', { toolCallId: 'tc-1' })).rejects.toThrow(
				ForbiddenError,
			);
			expect(threadMetadata.update).not.toHaveBeenCalled();
		});
	});

	describe('edit', () => {
		it('updates the row, then stores an edited card with where the row landed', async () => {
			const preference = mock<AiPreferenceDto>({
				id: 'pref-1',
				content: 'Short replies.',
				projectId: 'project-1',
				userId: null,
			});
			preferenceCards.editRow.mockResolvedValue(preference);

			const response = await service.edit(user, THREAD_ID, 'pref-1', {
				toolCallId: 'tc-1',
				content: 'Short replies.',
				scope: 'project',
				projectId: 'project-1',
			});

			expect(preferenceCards.editRow).toHaveBeenCalledWith(user, 'pref-1', {
				content: 'Short replies.',
				scope: 'project',
				projectId: 'project-1',
				userId: undefined,
			});
			const card = {
				toolCallId: 'tc-1',
				preferenceId: 'pref-1',
				state: 'edited',
				content: 'Short replies.',
				scope: 'project',
				projectId: 'project-1',
			};
			expect(response).toEqual({ preference, card });
			expect(stored).toEqual({ 'tc-1': card });
		});

		it('checks the thread before it updates the row', async () => {
			threadMetadata.read.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(
				service.edit(user, THREAD_ID, 'pref-1', { toolCallId: 'tc-1', content: 'x' }),
			).rejects.toThrow(NotFoundError);
			expect(preferenceCards.editRow).not.toHaveBeenCalled();
		});
	});

	describe('withCard', () => {
		const card = (n: number): AssistantPreferenceCard => ({
			toolCallId: `tc-${n}`,
			preferenceId: `pref-${n}`,
			state: 'undone',
		});

		it('keeps the edited text and scope when an undo follows an edit', () => {
			const edited: AssistantPreferenceCard = {
				...card(1),
				state: 'edited',
				content: 'Two sticky notes.',
				scope: 'project',
				projectId: 'project-1',
			};

			expect(withCard({ 'tc-1': edited, 'tc-2': card(2) }, card(1))).toEqual({
				'tc-2': card(2),
				'tc-1': { ...edited, state: 'undone' },
			});
		});

		it('clears the project when an edit moves the row out of the project', () => {
			const inProject: AssistantPreferenceCard = {
				...card(1),
				state: 'edited',
				content: 'x',
				scope: 'project',
				projectId: 'project-1',
			};
			const moved: AssistantPreferenceCard = {
				...card(1),
				state: 'edited',
				content: 'x',
				scope: 'user',
				projectId: null,
			};

			expect(withCard({ 'tc-1': inProject }, moved)['tc-1']).toEqual(moved);
		});

		it('drops the oldest cards when the state is full', () => {
			const full = Object.fromEntries(
				Array.from({ length: MAX_ASSISTANT_PREFERENCE_CARDS }, (_, n) => [`tc-${n}`, card(n)]),
			);

			const next = withCard(full, card(MAX_ASSISTANT_PREFERENCE_CARDS));

			expect(Object.keys(next)).toHaveLength(MAX_ASSISTANT_PREFERENCE_CARDS);
			expect(next['tc-0']).toBeUndefined();
			expect(next[`tc-${MAX_ASSISTANT_PREFERENCE_CARDS}`]).toEqual(
				card(MAX_ASSISTANT_PREFERENCE_CARDS),
			);
		});
	});
});
