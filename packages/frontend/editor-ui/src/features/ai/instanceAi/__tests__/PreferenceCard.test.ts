import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import type { InstanceAiEvent, InstanceAiToolCallState } from '@n8n/api-types';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { mockedStore } from '@/__tests__/utils';
import { useUsersStore } from '@n8n/stores/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import PreferenceCard from '../components/PreferenceCard.vue';
import { createThreadComponentRenderer, makeThread } from './createThreadComponentRenderer';

const undoPreferenceCard = vi.fn();
const editPreferenceCard = vi.fn();
vi.mock('../instanceAi.api', () => ({
	undoPreferenceCard: (...args: unknown[]) => undoPreferenceCard(...args),
	editPreferenceCard: (...args: unknown[]) => editPreferenceCard(...args),
}));

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'x' } }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/i18n')>()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, unknown> }) =>
			opts?.interpolate ? `${key}:${JSON.stringify(opts.interpolate)}` : key,
	}),
}));

const STORED_TEXT = 'Keep replies short.';

function toolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'save_user_preference',
		args: {},
		isLoading: false,
		result: {
			ok: true,
			preference: {
				id: 'pref-1',
				content: STORED_TEXT,
				scope: 'user',
				userId: 'user-1',
				projectId: null,
			},
		},
		...overrides,
	};
}

const undoneEvent: InstanceAiEvent = {
	type: 'preference-card',
	runId: 'run-1',
	agentId: 'orchestrator-run-1',
	payload: { toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'undone' },
};
const editedEvent: InstanceAiEvent = {
	...undoneEvent,
	payload: {
		toolCallId: 'tc-1',
		preferenceId: 'pref-1',
		state: 'edited',
		content: 'Keep replies brief.',
	},
};

const projectsState = {
	[STORES.PROJECTS]: {
		myProjects: [
			{
				id: 'thread-project',
				name: 'Marketing',
				type: 'team',
				scopes: ['projectAiPreference:create'],
			},
			{
				id: 'personal-1',
				name: 'Me <me@n8n.io>',
				type: 'personal',
				scopes: ['projectAiPreference:create'],
			},
		],
	},
};

const thread = makeThread();
const renderCard = createThreadComponentRenderer(
	PreferenceCard,
	{ pinia: createTestingPinia({ initialState: projectsState }) },
	() => thread,
);

/** The active turn: the row is expanded and the card offers Edit. */
function renderActive(overrides: Partial<InstanceAiToolCallState> = {}) {
	return renderCard({
		props: { toolCall: toolCall(overrides), runId: 'run-1', readOnly: false },
	});
}

/** An earlier turn: the row is collapsed and the card is read-only. */
function renderHistory(overrides: Partial<InstanceAiToolCallState> = {}) {
	return renderCard({
		props: { toolCall: toolCall(overrides), runId: 'run-1', readOnly: true },
	});
}

/** Opens the modal and returns its textarea. The test id sits on the N8nFormInput wrapper. */
async function openModal(): Promise<HTMLTextAreaElement> {
	await userEvent.click(screen.getByTestId('instance-ai-preference-card-edit'));
	const wrapper = await screen.findByTestId('instance-ai-preference-modal-text');
	return wrapper.querySelector('textarea')!;
}

function scopeOptionLabels() {
	return Array.from(document.querySelectorAll('li.el-select-dropdown__item')).map(
		(li) => li.textContent?.trim() ?? '',
	);
}

async function pickScope(label: string) {
	const option = Array.from(document.querySelectorAll('li.el-select-dropdown__item')).find((li) =>
		li.textContent?.includes(label),
	);
	if (!option) throw new Error(`No scope option "${label}"`);
	await userEvent.click(option);
}

describe('PreferenceCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = { id: 'user-1', globalScopes: [] } as never;
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.myProjects = projectsState[STORES.PROJECTS].myProjects as never;
	});

	describe('the row', () => {
		it('reads "Preference saved" and is expanded on the active turn', () => {
			renderActive();

			expect(screen.getByText('instanceAi.preferenceCard.saved')).toBeInTheDocument();
			expect(screen.getByTestId('instance-ai-preference-card-header')).toHaveAttribute(
				'aria-expanded',
				'true',
			);
			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(STORED_TEXT);
		});

		it('is collapsed in history, and the chevron opens it read-only', async () => {
			renderHistory();
			const header = screen.getByTestId('instance-ai-preference-card-header');
			expect(header).toHaveAttribute('aria-expanded', 'false');

			await userEvent.click(header);

			expect(header).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(STORED_TEXT);
			expect(screen.queryByTestId('instance-ai-preference-card-edit')).toBeNull();
		});

		it('the chevron collapses the active turn too', async () => {
			renderActive();
			const header = screen.getByTestId('instance-ai-preference-card-header');

			await userEvent.click(header);

			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		// The user reopened the card on the active turn, then sent another message.
		it('collapses when the turn moves into history, whatever the chevron did before', async () => {
			const { rerender } = renderActive();
			const header = screen.getByTestId('instance-ai-preference-card-header');
			await userEvent.click(header);
			await userEvent.click(header);
			expect(header).toHaveAttribute('aria-expanded', 'true');

			await rerender({ toolCall: toolCall(), runId: 'run-1', readOnly: true });

			expect(screen.getByTestId('instance-ai-preference-card-header')).toHaveAttribute(
				'aria-expanded',
				'false',
			);
		});

		it('reads "Preference removed" once the preference is undone', () => {
			renderActive({ preferenceCard: { state: 'undone' } });

			expect(screen.getByText('instanceAi.preferenceCard.removed')).toBeInTheDocument();
		});
	});

	describe('the compact card', () => {
		it('names "Just you" for a user-scoped row and links to the settings page', () => {
			renderActive();

			expect(screen.getByTestId('instance-ai-preference-card-scope')).toHaveTextContent(
				'instanceAi.preferenceCard.appliesTo:{"scope":"settings.context.preferences.scope.user"}',
			);
			expect(screen.getByTestId('instance-ai-preference-card-manage')).toBeInTheDocument();
		});

		it('names the project once a fact moved the row into one', () => {
			renderActive({
				preferenceCard: {
					state: 'edited',
					content: STORED_TEXT,
					scope: 'project',
					projectId: 'thread-project',
				},
			});

			// The mock's baseText renders `key:{json}`; the outer appliesTo call re-encodes
			// this scope string as JSON, which escapes its quotes. Assert on the key and the
			// interpolated name separately rather than on the brittle escaped literal.
			const scope = screen.getByTestId('instance-ai-preference-card-scope');
			expect(scope).toHaveTextContent('instanceAi.preferenceCard.scope.project');
			expect(scope).toHaveTextContent('Marketing');
		});

		it('calls a personal project by its kind, not its email-shaped name', () => {
			renderActive({
				preferenceCard: {
					state: 'edited',
					content: STORED_TEXT,
					scope: 'project',
					projectId: 'personal-1',
				},
			});

			expect(screen.getByTestId('instance-ai-preference-card-scope')).toHaveTextContent(
				'settings.context.preferences.scope.personalProject',
			);
		});

		it('falls back to "This project" for a project the store does not know', () => {
			// Review focus 5: an unknown project must not throw or show an id.
			renderActive({
				preferenceCard: {
					state: 'edited',
					content: STORED_TEXT,
					scope: 'project',
					projectId: 'gone',
				},
			});

			expect(screen.getByTestId('instance-ai-preference-card-scope')).toHaveTextContent(
				'instanceAi.preferenceCard.scope.projectFallback',
			);
		});

		it('names everyone on the instance after a move to instance scope', () => {
			renderActive({
				preferenceCard: {
					state: 'edited',
					content: STORED_TEXT,
					scope: 'instance',
					projectId: null,
				},
			});

			expect(screen.getByTestId('instance-ai-preference-card-scope')).toHaveTextContent(
				'settings.context.preferences.scope.instance',
			);
		});

		it('keeps "Manage preferences" and drops "Edit" in history', async () => {
			renderHistory();
			await userEvent.click(screen.getByTestId('instance-ai-preference-card-header'));

			expect(screen.getByTestId('instance-ai-preference-card-manage')).toBeInTheDocument();
			expect(screen.queryByTestId('instance-ai-preference-card-edit')).toBeNull();
		});

		it('shows the saved text without a strike-through', () => {
			renderActive();

			expect(screen.getByTestId('instance-ai-preference-card-text')).not.toHaveClass('removedText');
		});

		it('strikes the saved text through and offers no link once removed', () => {
			renderActive({ preferenceCard: { state: 'undone' } });

			const text = screen.getByTestId('instance-ai-preference-card-text');
			expect(text).toHaveTextContent(STORED_TEXT);
			expect(text).toHaveClass('removedText');
			expect(screen.queryByTestId('instance-ai-preference-card-edit')).toBeNull();
			expect(screen.queryByTestId('instance-ai-preference-card-manage')).toBeNull();
		});

		// Save "A", edit to "B", remove: the struck-out text is "B", the one the user
		// removed, not the "A" the tool result still holds.
		it('strikes the edited text through when the preference was edited before removal', () => {
			renderActive({ preferenceCard: { state: 'undone', content: 'Keep replies brief.' } });

			const text = screen.getByTestId('instance-ai-preference-card-text');
			expect(text).toHaveTextContent('Keep replies brief.');
			expect(text).not.toHaveTextContent(STORED_TEXT);
			expect(text).toHaveClass('removedText');
		});

		it('renders nothing for another tool that answers in the saved shape', () => {
			renderActive({ toolName: 'workflows' });

			expect(screen.queryByTestId('instance-ai-preference-card')).toBeNull();
		});

		it('shows the edited text after an edit fact', () => {
			renderActive({ preferenceCard: { state: 'edited', content: 'Keep replies brief.' } });

			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(
				'Keep replies brief.',
			);
		});
	});

	describe('a refused write', () => {
		const refused: Partial<InstanceAiToolCallState> = {
			args: { content: 'Keep replies short.', scope: 'user' },
			result: {
				ok: false,
				reason: 'duplicate',
				message: 'This user already has a preference with the same text',
			},
		};

		it('reads "Preference not saved" and shows the attempted text with the server message', () => {
			renderActive(refused);

			expect(screen.getByText('instanceAi.preferenceCard.notSaved')).toBeInTheDocument();
			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(STORED_TEXT);
			expect(screen.getByTestId('instance-ai-preference-card-error')).toHaveTextContent(
				'This user already has a preference with the same text',
			);
		});

		it('offers "Manage preferences" but no "Edit", because nothing was saved', () => {
			renderActive(refused);

			expect(screen.getByTestId('instance-ai-preference-card-manage')).toBeInTheDocument();
			expect(screen.queryByTestId('instance-ai-preference-card-edit')).toBeNull();
			expect(screen.queryByText(/instanceAi\.preferenceCard\.appliesTo/)).toBeNull();
		});

		it('falls back to a generic line when the result carries no message', () => {
			renderActive({ ...refused, result: { ok: false, reason: 'failed' } });

			expect(screen.getByTestId('instance-ai-preference-card-error')).toHaveTextContent(
				'instanceAi.preferenceCard.notSavedFallback',
			);
		});

		it('shows the refusal when the tool threw, without the internal error text', () => {
			renderActive({ ...refused, result: undefined, error: 'ECONNREFUSED' });

			expect(screen.getByText('instanceAi.preferenceCard.notSaved')).toBeInTheDocument();
			const error = screen.getByTestId('instance-ai-preference-card-error');
			expect(error).toHaveTextContent('instanceAi.preferenceCard.notSavedFallback');
			expect(error).not.toHaveTextContent('ECONNREFUSED');
		});

		it('reads "Preference not confirmed" when the run ended with the call in flight', () => {
			renderActive({
				...refused,
				result: undefined,
				error: 'Interrupted by a process restart',
				interrupted: true,
			});

			expect(screen.getByText('instanceAi.preferenceCard.notConfirmed')).toBeInTheDocument();
			expect(screen.queryByText('instanceAi.preferenceCard.notSaved')).toBeNull();
			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(STORED_TEXT);
			expect(screen.getByTestId('instance-ai-preference-card-error')).toHaveTextContent(
				'instanceAi.preferenceCard.notConfirmedMessage',
			);
			expect(screen.getByTestId('instance-ai-preference-card-manage')).toBeInTheDocument();
			expect(screen.queryByTestId('instance-ai-preference-card-edit')).toBeNull();
		});

		it('collapses to the row in history, like a saved card', () => {
			renderHistory(refused);

			expect(screen.getByTestId('instance-ai-preference-card-header')).toHaveAttribute(
				'aria-expanded',
				'false',
			);
			expect(screen.queryByTestId('instance-ai-preference-card-error')).toBeNull();
		});
	});

	describe('being seen', () => {
		it('reports the card once, with the scope and the state it rendered in', () => {
			renderActive();

			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_SAW_PREFERENCE_CARD, {
				scope_type: 'user',
				state: 'saved',
			});
			expect(
				track.mock.calls.filter(
					([event]) => event === TELEMETRY_EVENT.CONTEXT.USER_SAW_PREFERENCE_CARD,
				),
			).toHaveLength(1);
		});

		// Reopening an old thread re-renders every card. Counting those would read as the user
		// being shown the same confirmation again.
		it('reports nothing for a card in history', () => {
			renderHistory();

			expect(track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_SAW_PREFERENCE_CARD,
				expect.anything(),
			);
		});

		it('names the scope the card shows after a move', () => {
			renderActive({
				preferenceCard: {
					state: 'edited',
					content: STORED_TEXT,
					scope: 'instance',
					projectId: null,
				},
			});

			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_SAW_PREFERENCE_CARD, {
				scope_type: 'instance',
				state: 'edited',
			});
		});
	});

	describe('the edit modal', () => {
		// The same scope label, required mark, cap, and counter as the settings page modal.
		it('opens with the stored text and "Just you" selected, and the select is enabled', async () => {
			renderActive();
			const input = await openModal();

			expect(input).toHaveValue(STORED_TEXT);
			expect(input).toHaveAttribute('maxlength', String(AI_PREFERENCE_CONTENT_MAX_LENGTH));
			expect(screen.getByTestId('instance-ai-preference-modal-counter')).toHaveTextContent(
				`${STORED_TEXT.length} / ${AI_PREFERENCE_CONTENT_MAX_LENGTH}`,
			);
			const scopeInput = screen
				.getByTestId('instance-ai-preference-modal-scope')
				.querySelector('input');
			expect(scopeInput).not.toBeDisabled();
			expect(scopeInput).toHaveValue('settings.context.preferences.scope.user');
		});

		it('offers the bound project when the user may write it, and no instance option to a member', async () => {
			renderActive();
			await openModal();

			const labels = scopeOptionLabels();
			expect(labels).toContain('settings.context.preferences.scope.user');
			expect(labels).toContain('instanceAi.preferenceCard.scope.project:{"name":"Marketing"}');
			expect(labels).not.toContain('settings.context.preferences.scope.instance');
		});

		it('hides the bound project from a user who may only read it', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.myProjects = [
				{
					id: 'thread-project',
					name: 'Marketing',
					type: 'team',
					scopes: ['projectAiPreference:read'],
				},
			] as never;
			renderActive();
			await openModal();

			expect(scopeOptionLabels()).toEqual(['settings.context.preferences.scope.user']);
		});

		it('offers everyone on the instance to a user with the global create scope', async () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { id: 'user-1', globalScopes: ['aiPreference:create'] } as never;
			renderActive();
			await openModal();

			expect(scopeOptionLabels()).toContain('settings.context.preferences.scope.instance');
		});

		it('keeps the current scope as an option even when the user may not write it any more', async () => {
			// Review focus 4: the select must show the truth about where the row is.
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.myProjects = [
				{
					id: 'thread-project',
					name: 'Marketing',
					type: 'team',
					scopes: ['projectAiPreference:read'],
				},
			] as never;
			renderActive({
				preferenceCard: {
					state: 'edited',
					content: STORED_TEXT,
					scope: 'project',
					projectId: 'thread-project',
				},
			});
			await openModal();

			const scopeInput = screen
				.getByTestId('instance-ai-preference-modal-scope')
				.querySelector('input');
			expect(scopeInput).toHaveValue(
				'instanceAi.preferenceCard.scope.project:{"name":"Marketing"}',
			);
			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeDisabled();
		});

		it('enables Save on a scope change alone and sends the project', async () => {
			editPreferenceCard.mockResolvedValue({
				preference: { id: 'pref-1', content: STORED_TEXT },
				event: {
					...editedEvent,
					payload: {
						toolCallId: 'tc-1',
						preferenceId: 'pref-1',
						state: 'edited',
						content: STORED_TEXT,
						scope: 'project',
						projectId: 'thread-project',
					},
				},
			});
			renderActive();
			await openModal();
			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeDisabled();

			await pickScope('instanceAi.preferenceCard.scope.project');
			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeEnabled();
			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-save'));

			await waitFor(() =>
				expect(editPreferenceCard).toHaveBeenCalledWith(expect.anything(), 'thread-1', 'pref-1', {
					runId: 'run-1',
					toolCallId: 'tc-1',
					content: STORED_TEXT,
					scope: 'project',
					projectId: 'thread-project',
					userId: null,
				}),
			);
		});

		// The owner is never guessed: the server refuses a user-scope edit that names none, and a
		// guess here would read as a move of the row to whoever is editing it.
		it('names no owner for a user-scoped row whose result carried none', async () => {
			editPreferenceCard.mockResolvedValue({
				preference: { id: 'pref-1', content: 'Keep replies brief.' },
				event: editedEvent,
			});
			renderActive({
				result: { ok: true, preference: { id: 'pref-1', content: STORED_TEXT, scope: 'user' } },
			});
			const input = await openModal();

			await userEvent.clear(input);
			await userEvent.type(input, 'Keep replies brief.');
			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-save'));

			await waitFor(() =>
				expect(editPreferenceCard).toHaveBeenCalledWith(
					expect.anything(),
					'thread-1',
					'pref-1',
					expect.objectContaining({ scope: 'user', userId: null, projectId: null }),
				),
			);
		});

		it('names the caller when a row moves into the user scope, which has no prior owner', async () => {
			editPreferenceCard.mockResolvedValue({
				preference: { id: 'pref-1', content: STORED_TEXT },
				event: editedEvent,
			});
			renderActive({
				preferenceCard: {
					state: 'edited',
					content: STORED_TEXT,
					scope: 'instance',
					projectId: null,
				},
			});
			await openModal();

			await pickScope('settings.context.preferences.scope.user');
			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-save'));

			await waitFor(() =>
				expect(editPreferenceCard).toHaveBeenCalledWith(
					expect.anything(),
					'thread-1',
					'pref-1',
					expect.objectContaining({ scope: 'user', userId: 'user-1', projectId: null }),
				),
			);
		});

		it('disables Save while the text is unchanged', async () => {
			renderActive();
			await openModal();

			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeDisabled();
		});

		it('disables Save on empty text and the counter reads zero', async () => {
			renderActive();
			const input = await openModal();

			await userEvent.clear(input);

			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeDisabled();
			expect(screen.getByTestId('instance-ai-preference-modal-counter')).toHaveTextContent(
				`0 / ${AI_PREFERENCE_CONTENT_MAX_LENGTH}`,
			);
		});

		it('caps the text at the limit and the counter follows', async () => {
			renderActive();
			const input = await openModal();

			// `paste` instead of `type`: 2001 keystrokes would time the test out.
			await userEvent.clear(input);
			await userEvent.click(input);
			await userEvent.paste('a'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH + 1));

			expect(input).toHaveValue('a'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH));
			expect(screen.getByTestId('instance-ai-preference-modal-counter')).toHaveTextContent(
				`${AI_PREFERENCE_CONTENT_MAX_LENGTH} / ${AI_PREFERENCE_CONTENT_MAX_LENGTH}`,
			);
			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeEnabled();
		});

		it('Save calls the endpoint, applies the returned fact and closes', async () => {
			editPreferenceCard.mockResolvedValue({
				preference: { id: 'pref-1', content: 'Keep replies brief.' },
				event: editedEvent,
			});
			renderActive();
			const input = await openModal();

			await userEvent.clear(input);
			await userEvent.type(input, 'Keep replies brief.');
			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-save'));

			await waitFor(() =>
				expect(editPreferenceCard).toHaveBeenCalledWith(expect.anything(), 'thread-1', 'pref-1', {
					runId: 'run-1',
					toolCallId: 'tc-1',
					content: 'Keep replies brief.',
					scope: 'user',
					projectId: null,
					userId: 'user-1',
				}),
			);
			expect(thread.applyEvent).toHaveBeenCalledWith(editedEvent);
			await waitFor(() =>
				expect(screen.queryByTestId('instance-ai-preference-modal-text')).toBeNull(),
			);
		});

		it('keeps the modal open and shows the refusal when Save fails', async () => {
			editPreferenceCard.mockRejectedValue(new Error('A preference with this text exists'));
			renderActive();
			const input = await openModal();

			await userEvent.clear(input);
			await userEvent.type(input, 'Keep replies brief.');
			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-save'));

			await waitFor(() =>
				expect(screen.getByTestId('instance-ai-preference-modal-error')).toHaveTextContent(
					'A preference with this text exists',
				),
			);
			expect(screen.getByTestId('instance-ai-preference-modal-text')).toBeInTheDocument();
			expect(thread.applyEvent).not.toHaveBeenCalled();
		});

		it('Remove calls the endpoint with no second confirmation and closes', async () => {
			undoPreferenceCard.mockResolvedValue({ ok: true, event: undoneEvent });
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));

			await waitFor(() =>
				expect(undoPreferenceCard).toHaveBeenCalledWith(expect.anything(), 'thread-1', 'pref-1', {
					runId: 'run-1',
					toolCallId: 'tc-1',
				}),
			);
			expect(thread.applyEvent).toHaveBeenCalledWith(undoneEvent);
			await waitFor(() =>
				expect(screen.queryByTestId('instance-ai-preference-modal-text')).toBeNull(),
			);
		});

		// Escape or the X while the request is pending would hide the refusal it may return.
		it('ignores a close request while Remove is in flight, then closes on success', async () => {
			let settle: (value: unknown) => void = () => {};
			undoPreferenceCard.mockReturnValue(new Promise((resolve) => (settle = resolve)));
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));
			await waitFor(() => expect(undoPreferenceCard).toHaveBeenCalled());
			await userEvent.keyboard('{Escape}');

			expect(screen.getByTestId('instance-ai-preference-modal-text')).toBeInTheDocument();

			settle({ ok: true, event: undoneEvent });
			await waitFor(() =>
				expect(screen.queryByTestId('instance-ai-preference-modal-text')).toBeNull(),
			);
		});

		// The undo endpoint reports the removal: only the server still holds the row, and with it
		// the scope and the age the event carries.
		it('undo reports no delete from the card, because the server reports it', async () => {
			undoPreferenceCard.mockResolvedValue({ ok: true, event: undoneEvent });
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));

			await waitFor(() => expect(undoPreferenceCard).toHaveBeenCalled());
			expect(track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES,
				expect.anything(),
			);
		});

		it('undo reports nothing when the delete failed', async () => {
			undoPreferenceCard.mockRejectedValue(new Error('nope'));
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));

			await waitFor(() => expect(undoPreferenceCard).toHaveBeenCalled());
			expect(track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES,
				expect.anything(),
			);
		});

		it('undo reports nothing when the response carries no valid event', async () => {
			undoPreferenceCard.mockResolvedValue({ ok: true, event: { type: 'nope' } });
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));

			await waitFor(() => expect(undoPreferenceCard).toHaveBeenCalled());
			expect(track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES,
				expect.anything(),
			);
		});

		it('keeps the modal open and shows the error when Remove fails', async () => {
			undoPreferenceCard.mockRejectedValue(new Error('Preference not found'));
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));

			await waitFor(() =>
				expect(screen.getByTestId('instance-ai-preference-modal-error')).toHaveTextContent(
					'Preference not found',
				),
			);
			expect(screen.getByTestId('instance-ai-preference-modal-text')).toBeInTheDocument();
		});

		// The row was deleted elsewhere first (settings page), so the endpoint answers 404.
		it('shows the server message and keeps the card when Remove is refused with a 404', async () => {
			undoPreferenceCard.mockRejectedValue(
				new ResponseError('Preference with id pref-1 not found', {
					errorCode: 404,
					httpStatusCode: 404,
				}),
			);
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));

			await waitFor(() =>
				expect(screen.getByTestId('instance-ai-preference-modal-error')).toHaveTextContent(
					'Preference with id pref-1 not found',
				),
			);
			expect(screen.getByTestId('instance-ai-preference-modal-text')).toBeInTheDocument();
			expect(thread.applyEvent).not.toHaveBeenCalled();
			expect(screen.getByText('instanceAi.preferenceCard.saved')).toBeInTheDocument();
		});

		// A 2xx body without the fact leaves the row state unknown: the card must not move
		// and the modal must not close on it.
		it.each([
			['undefined', undefined],
			['an empty object', {}],
			['a body whose event is not a preference-card fact', { ok: true, event: { type: 'nope' } }],
		])('treats a Remove response of %s as a failure', async (_label, response) => {
			undoPreferenceCard.mockResolvedValue(response);
			renderActive();
			await openModal();

			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-remove'));

			await waitFor(() =>
				expect(screen.getByTestId('instance-ai-preference-modal-error')).toHaveTextContent(
					'instanceAi.preferenceCard.modal.removeFailed',
				),
			);
			expect(screen.getByTestId('instance-ai-preference-modal-text')).toBeInTheDocument();
			expect(thread.applyEvent).not.toHaveBeenCalled();
			expect(screen.getByText('instanceAi.preferenceCard.saved')).toBeInTheDocument();
		});

		it.each([
			['undefined', undefined],
			['an empty object', {}],
			[
				'a body whose event is not a preference-card fact',
				{ preference: {}, event: { type: 'nope' } },
			],
		])('treats a Save response of %s as a failure', async (_label, response) => {
			editPreferenceCard.mockResolvedValue(response);
			renderActive();
			const input = await openModal();

			await userEvent.clear(input);
			await userEvent.type(input, 'Keep replies brief.');
			await userEvent.click(screen.getByTestId('instance-ai-preference-modal-save'));

			await waitFor(() =>
				expect(screen.getByTestId('instance-ai-preference-modal-error')).toHaveTextContent(
					'instanceAi.preferenceCard.modal.saveFailed',
				),
			);
			expect(screen.getByTestId('instance-ai-preference-modal-text')).toBeInTheDocument();
			expect(thread.applyEvent).not.toHaveBeenCalled();
			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(STORED_TEXT);
		});

		it('Cancel changes nothing', async () => {
			renderActive();
			const input = await openModal();

			await userEvent.clear(input);
			await userEvent.type(input, 'Keep replies brief.');
			await userEvent.click(screen.getByText('instanceAi.preferenceCard.modal.cancel'));

			await waitFor(() =>
				expect(screen.queryByTestId('instance-ai-preference-modal-text')).toBeNull(),
			);
			expect(editPreferenceCard).not.toHaveBeenCalled();
			expect(undoPreferenceCard).not.toHaveBeenCalled();
			expect(screen.getByTestId('instance-ai-preference-card-text')).toHaveTextContent(STORED_TEXT);
		});
	});
});
