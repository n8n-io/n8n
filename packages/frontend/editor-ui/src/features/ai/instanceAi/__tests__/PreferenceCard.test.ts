import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import type { InstanceAiEvent, InstanceAiToolCallState } from '@n8n/api-types';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';

import PreferenceCard from '../components/PreferenceCard.vue';
import { createThreadComponentRenderer, makeThread } from './createThreadComponentRenderer';

const undoPreferenceCard = vi.fn();
const editPreferenceCard = vi.fn();
vi.mock('../instanceAi.api', () => ({
	undoPreferenceCard: (...args: unknown[]) => undoPreferenceCard(...args),
	editPreferenceCard: (...args: unknown[]) => editPreferenceCard(...args),
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
		result: { ok: true, preference: { id: 'pref-1', content: STORED_TEXT, scope: 'user' } },
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

const thread = makeThread();
const renderCard = createThreadComponentRenderer(
	PreferenceCard,
	{ pinia: createTestingPinia() },
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

async function openModal() {
	await userEvent.click(screen.getByTestId('instance-ai-preference-card-edit'));
	return await screen.findByTestId('instance-ai-preference-modal-text');
}

describe('PreferenceCard', () => {
	beforeEach(() => vi.clearAllMocks());

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
		it('names the scope and links to the settings page', () => {
			renderActive();

			expect(screen.getByText(/instanceAi\.preferenceCard\.appliesTo/)).toBeInTheDocument();
			expect(screen.getByTestId('instance-ai-preference-card-manage')).toBeInTheDocument();
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

	describe('the edit modal', () => {
		it('opens with the stored text and a disabled scope of "Just you"', async () => {
			renderActive();
			const input = await openModal();

			expect(input).toHaveValue(STORED_TEXT);
			const scope = screen.getByTestId('instance-ai-preference-modal-scope');
			const scopeInput = scope.querySelector('input');
			expect(scopeInput).toBeDisabled();
			expect(scopeInput).toHaveValue('instanceAi.preferenceCard.scope.user');
		});

		it('disables Save while the text is unchanged', async () => {
			renderActive();
			await openModal();

			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeDisabled();
		});

		it('disables Save on empty text and names the rule', async () => {
			renderActive();
			const input = await openModal();

			await userEvent.clear(input);

			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeDisabled();
			expect(screen.getByTestId('instance-ai-preference-modal-validation')).toHaveTextContent(
				'instanceAi.preferenceCard.validation.empty',
			);
		});

		it('disables Save past the limit and names the limit', async () => {
			renderActive();
			const input = await openModal();

			// `paste` instead of `type`: 2001 keystrokes would time the test out.
			await userEvent.clear(input);
			await userEvent.click(input);
			await userEvent.paste('a'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH + 1));

			expect(screen.getByTestId('instance-ai-preference-modal-save')).toBeDisabled();
			expect(screen.getByTestId('instance-ai-preference-modal-validation')).toHaveTextContent(
				`instanceAi.preferenceCard.validation.tooLong:{"max":${AI_PREFERENCE_CONTENT_MAX_LENGTH}}`,
			);
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
