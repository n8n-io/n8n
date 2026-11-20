import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import type { AiPreferenceDto, AssistantPreferenceCard } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useContextStore } from '@/features/settings/context/context.store';

import { ASSISTANT_AGENT_PROJECT_ID } from '../assistantAgentThreads';
import AssistantPreferenceCardResult from '../AssistantPreferenceCardResult.vue';
import {
	ASSISTANT_PREFERENCE_CARDS,
	type AssistantPreferenceCards,
	useAssistantPreferenceCards,
} from '../assistantPreferenceCards';

const api = vi.hoisted(() => ({
	fetchAssistantPreferenceCards: vi.fn(),
	undoAssistantPreferenceCard: vi.fn(),
	editAssistantPreferenceCard: vi.fn(),
}));
vi.mock('../assistantPreferenceCards.api', () => api);

const track = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'x' } }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/i18n')>()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const STORED_TEXT = 'Keep replies short.';

const toolCall: ToolCall = {
	tool: 'save_user_preference',
	toolCallId: 'tc-1',
	input: { content: STORED_TEXT, scope: 'user' },
	output: {
		ok: true,
		preference: { id: 'pref-1', content: STORED_TEXT, scope: 'user', userId: 'user-1' },
	},
	state: TOOL_CALL_STATE.DONE,
};

const renderComponent = createComponentRenderer(AssistantPreferenceCardResult, {
	pinia: createTestingPinia(),
});

function useCards(lastToolCallIds: string[] = ['tc-1']) {
	return useAssistantPreferenceCards({
		threadId: 'thread-1',
		projectId: 'project-1',
		messages: () => [
			{
				id: 'm1',
				role: 'assistant',
				content: '',
				toolCalls: lastToolCallIds.map((toolCallId) => ({ ...toolCall, toolCallId })),
			},
		],
	});
}

/** Renders the card in a thread whose last message is `lastToolCallIds`. */
function render(
	lastToolCallIds: string[] = ['tc-1'],
	cards: AssistantPreferenceCards = useCards(lastToolCallIds),
) {
	return renderComponent({
		props: { toolCall },
		global: {
			provide: {
				[ASSISTANT_PREFERENCE_CARDS as symbol]: cards,
				[ASSISTANT_AGENT_PROJECT_ID as symbol]: 'project-1',
			},
		},
	});
}

async function openCard() {
	await userEvent.click(screen.getByTestId('instance-ai-preference-card-header'));
}

describe('AssistantPreferenceCardResult', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		api.fetchAssistantPreferenceCards.mockResolvedValue({ cards: {} });
		mockedStore(useUsersStore).currentUser = { id: 'user-1', globalScopes: [] } as never;
		mockedStore(useContextStore).rowById = new Map() as never;
	});

	it('shows the saved preference and loads the stored cards of the thread', async () => {
		render();

		expect(screen.getByText('instanceAi.preferenceCard.saved.justForYou')).toBeInTheDocument();
		await openCard();
		expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(STORED_TEXT);
		expect(api.fetchAssistantPreferenceCards).toHaveBeenCalledWith(expect.anything(), 'thread-1');
	});

	it('reports that the user saw the card once, when the chat mounts the card again', () => {
		const cards = useCards();
		render(['tc-1'], cards).unmount();
		render(['tc-1'], cards);

		const seen = track.mock.calls.filter(
			([event]) => event === TELEMETRY_EVENT.CONTEXT.USER_SAW_PREFERENCE_CARD,
		);
		expect(seen).toHaveLength(1);
	});

	it('shows the stored undone state after a reload', async () => {
		const undone: AssistantPreferenceCard = {
			toolCallId: 'tc-1',
			preferenceId: 'pref-1',
			state: 'undone',
		};
		api.fetchAssistantPreferenceCards.mockResolvedValue({ cards: { 'tc-1': undone } });

		render();

		expect(await screen.findByText('instanceAi.preferenceCard.removed')).toBeInTheDocument();
	});

	it('is read-only when the call is not in the last message', async () => {
		render(['tc-2']);

		await openCard();

		expect(screen.queryByTestId('instance-ai-preference-card-edit')).toBeNull();
	});

	it('saves an edit through the Assistant agent endpoint and shows the new text', async () => {
		const edited = 'Keep replies brief.';
		api.editAssistantPreferenceCard.mockResolvedValue({
			preference: { id: 'pref-1', content: edited, userId: 'user-1', projectId: null },
			card: { toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'edited', content: edited },
		} satisfies { preference: Partial<AiPreferenceDto>; card: AssistantPreferenceCard });
		render();

		await openCard();
		await userEvent.click(screen.getByTestId('instance-ai-preference-card-edit'));
		const textarea = (await screen.findByTestId('instance-ai-preference-modal-text')).querySelector(
			'textarea',
		)!;
		await userEvent.clear(textarea);
		await userEvent.type(textarea, edited);
		await userEvent.click(screen.getByTestId('instance-ai-preference-modal-save'));

		await waitFor(() =>
			expect(api.editAssistantPreferenceCard).toHaveBeenCalledWith(
				expect.anything(),
				'thread-1',
				'pref-1',
				{ toolCallId: 'tc-1', content: edited },
			),
		);
		await waitFor(() =>
			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(edited),
		);
	});

	it('removes the preference through the Assistant agent endpoint', async () => {
		api.undoAssistantPreferenceCard.mockResolvedValue({
			card: { toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'undone' },
		});
		render();

		await openCard();
		await userEvent.click(screen.getByTestId('instance-ai-preference-card-edit'));
		await userEvent.click(await screen.findByTestId('instance-ai-preference-modal-remove'));

		await waitFor(() =>
			expect(api.undoAssistantPreferenceCard).toHaveBeenCalledWith(
				expect.anything(),
				'thread-1',
				'pref-1',
				{ toolCallId: 'tc-1' },
			),
		);
		expect(await screen.findByText('instanceAi.preferenceCard.removed')).toBeInTheDocument();
	});
});
