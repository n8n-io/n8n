import type { AiPreferenceDto, AssistantPreferenceCard } from '@n8n/api-types';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

import {
	isPreferenceCardToolCall,
	toPreferenceCardToolCall,
	useAssistantPreferenceCards,
} from '../assistantPreferenceCards';

const api = vi.hoisted(() => ({
	fetchAssistantPreferenceCards: vi.fn(),
	undoAssistantPreferenceCard: vi.fn(),
	editAssistantPreferenceCard: vi.fn(),
}));
vi.mock('../assistantPreferenceCards.api', () => api);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'x' } }),
}));

const preferences = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/features/settings/context/context.utils', () => ({
	isContextPreferencesEnabled: () => preferences.enabled,
}));

const savedOutput = {
	ok: true,
	preference: { id: 'pref-1', content: 'Keep replies short.', scope: 'user', userId: 'user-1' },
};

function toolCall(overrides: Partial<ToolCall> = {}): ToolCall {
	return {
		tool: 'save_user_preference',
		toolCallId: 'tc-1',
		input: { content: 'Keep replies short.', scope: 'user' },
		output: savedOutput,
		state: TOOL_CALL_STATE.DONE,
		...overrides,
	};
}

const undone: AssistantPreferenceCard = {
	toolCallId: 'tc-1',
	preferenceId: 'pref-1',
	state: 'undone',
};

describe('isPreferenceCardToolCall', () => {
	it('matches a saved and a refused write of the save tool', () => {
		expect(isPreferenceCardToolCall(toolCall())).toBe(true);
		expect(isPreferenceCardToolCall(toolCall({ output: { ok: false, reason: 'duplicate' } }))).toBe(
			true,
		);
	});

	it('does not match another tool or another result shape', () => {
		expect(isPreferenceCardToolCall(toolCall({ tool: 'other_tool' }))).toBe(false);
		expect(isPreferenceCardToolCall(toolCall({ output: 'Error: failed' }))).toBe(false);
	});

	it('does not match when preferences are off, as the current Assistant hides the card', () => {
		preferences.enabled = false;
		try {
			expect(isPreferenceCardToolCall(toolCall())).toBe(false);
		} finally {
			preferences.enabled = true;
		}
	});
});

describe('toPreferenceCardToolCall', () => {
	it('maps the call to the shape of the current Assistant card', () => {
		expect(toPreferenceCardToolCall(toolCall(), undefined)).toEqual({
			toolCallId: 'tc-1',
			toolName: 'save_user_preference',
			args: { content: 'Keep replies short.', scope: 'user' },
			result: savedOutput,
			isLoading: false,
		});
	});

	it('uses the stored card as the later fact', () => {
		const edited: AssistantPreferenceCard = {
			...undone,
			state: 'edited',
			content: 'Brief replies.',
			scope: 'project',
			projectId: 'project-1',
		};

		expect(toPreferenceCardToolCall(toolCall(), edited).preferenceCard).toEqual({
			state: 'edited',
			content: 'Brief replies.',
			scope: 'project',
			projectId: 'project-1',
		});
	});
});

describe('useAssistantPreferenceCards', () => {
	let messages: ChatMessage[];

	function create() {
		return useAssistantPreferenceCards({
			threadId: 'thread-1',
			projectId: 'project-1',
			messages: () => messages,
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
		messages = [];
	});

	it('loads the stored cards once', async () => {
		api.fetchAssistantPreferenceCards.mockResolvedValue({ cards: { 'tc-1': undone } });
		const cards = create();

		await Promise.all([cards.load(), cards.load()]);

		expect(api.fetchAssistantPreferenceCards).toHaveBeenCalledTimes(1);
		expect(api.fetchAssistantPreferenceCards).toHaveBeenCalledWith(expect.anything(), 'thread-1');
		expect(cards.get('tc-1')).toEqual(undone);
	});

	it('loads again after a failed load', async () => {
		api.fetchAssistantPreferenceCards.mockRejectedValueOnce(new Error('offline'));
		api.fetchAssistantPreferenceCards.mockResolvedValueOnce({ cards: { 'tc-1': undone } });
		const cards = create();

		await cards.load();
		expect(cards.get('tc-1')).toBeUndefined();
		await cards.load();

		expect(cards.get('tc-1')).toEqual(undone);
	});

	it('applies the card that undo returns', async () => {
		api.undoAssistantPreferenceCard.mockResolvedValue({ card: undone });
		const cards = create();

		await expect(
			cards.host.undo({ preferenceId: 'pref-1', toolCallId: 'tc-1', runId: '' }),
		).resolves.toBe(true);

		expect(api.undoAssistantPreferenceCard).toHaveBeenCalledWith(
			expect.anything(),
			'thread-1',
			'pref-1',
			{ toolCallId: 'tc-1' },
		);
		expect(cards.get('tc-1')).toEqual(undone);
	});

	it('applies the card that edit returns and gives back the row', async () => {
		const card: AssistantPreferenceCard = { ...undone, state: 'edited', content: 'Brief.' };
		const preference = { id: 'pref-1', content: 'Brief.' } as AiPreferenceDto;
		api.editAssistantPreferenceCard.mockResolvedValue({ card, preference });
		const cards = create();

		await expect(
			cards.host.edit(
				{ preferenceId: 'pref-1', toolCallId: 'tc-1', runId: '' },
				{ content: 'Brief.' },
			),
		).resolves.toBe(preference);

		expect(api.editAssistantPreferenceCard).toHaveBeenCalledWith(
			expect.anything(),
			'thread-1',
			'pref-1',
			{ toolCallId: 'tc-1', content: 'Brief.' },
		);
		expect(cards.get('tc-1')).toEqual(card);
	});

	it('keeps the edited text when an undo follows an edit', async () => {
		const edited: AssistantPreferenceCard = {
			...undone,
			state: 'edited',
			content: 'Two sticky notes.',
			scope: 'user',
			projectId: null,
		};
		api.editAssistantPreferenceCard.mockResolvedValue({
			card: edited,
			preference: { id: 'pref-1' } as AiPreferenceDto,
		});
		api.undoAssistantPreferenceCard.mockResolvedValue({ card: undone });
		const cards = create();
		const target = { preferenceId: 'pref-1', toolCallId: 'tc-1', runId: '' };

		await cards.host.edit(target, { content: 'Two sticky notes.' });
		await cards.host.undo(target);

		expect(cards.get('tc-1')).toEqual({ ...edited, state: 'undone' });
	});

	it('keeps a card that the user changed over the stored one', async () => {
		const edited: AssistantPreferenceCard = { ...undone, state: 'edited', content: 'Brief.' };
		api.undoAssistantPreferenceCard.mockResolvedValue({ card: undone });
		api.fetchAssistantPreferenceCards.mockResolvedValue({ cards: { 'tc-1': edited } });
		const cards = create();

		await cards.host.undo({ preferenceId: 'pref-1', toolCallId: 'tc-1', runId: '' });
		await cards.load();

		expect(cards.get('tc-1')).toEqual(undone);
	});

	it('names the working project of the thread', () => {
		expect(create().host.projectId()).toBe('project-1');
	});

	it('treats every call in the last turn as the latest', () => {
		const cards = create();
		messages = [
			{ id: 'm0', role: 'user', content: 'First' },
			{ id: 'm1', role: 'assistant', content: '', toolCalls: [toolCall({ toolCallId: 'tc-1' })] },
			{ id: 'm2', role: 'assistant', content: '', toolCalls: [toolCall({ toolCallId: 'tc-2' })] },
		];

		expect(cards.isLatest('tc-1')).toBe(true);
		expect(cards.isLatest('tc-2')).toBe(true);

		messages.push({ id: 'm3', role: 'user', content: 'Next' });
		expect(cards.isLatest('tc-1')).toBe(false);
		expect(cards.isLatest('tc-2')).toBe(false);
	});

	it('keeps the card editable when a text reply follows the save call', () => {
		const cards = create();
		messages = [
			{ id: 'm0', role: 'user', content: 'Use snake_case' },
			{ id: 'm1', role: 'assistant', content: '', toolCalls: [toolCall({ toolCallId: 'tc-1' })] },
			{ id: 'm2', role: 'assistant', content: 'Saved, I will use snake_case.', toolCalls: [] },
		];

		expect(cards.isLatest('tc-1')).toBe(true);
	});

	it('makes a card of an earlier turn read-only', () => {
		const cards = create();
		messages = [
			{ id: 'm0', role: 'user', content: 'Use snake_case' },
			{ id: 'm1', role: 'assistant', content: '', toolCalls: [toolCall({ toolCallId: 'tc-1' })] },
			{ id: 'm2', role: 'user', content: 'Build a workflow' },
			{ id: 'm3', role: 'assistant', content: 'Done.', toolCalls: [] },
		];

		expect(cards.isLatest('tc-1')).toBe(false);
	});
});
