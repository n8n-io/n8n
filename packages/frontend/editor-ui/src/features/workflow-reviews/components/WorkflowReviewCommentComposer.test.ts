import { WORKFLOW_REVIEW_COMMENT_MAX_LENGTH } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useReviewActivityStore } from '../reviewActivity.store';
import WorkflowReviewCommentComposer from './WorkflowReviewCommentComposer.vue';

const showError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

/**
 * The real N8nChatInput is mounted on purpose: `submitDisabled` overrides the
 * component's whole internal send gate, which a stub cannot show.
 */
const renderComponent = createComponentRenderer(WorkflowReviewCommentComposer);

describe('WorkflowReviewCommentComposer', () => {
	let store: ReturnType<typeof mockedStore<typeof useReviewActivityStore>>;

	beforeEach(() => {
		createTestingPinia();
		showError.mockReset();
		store = mockedStore(useReviewActivityStore);
		store.posting = false;
		store.draft = '';
		store.postComment.mockResolvedValue(undefined);
	});

	it('keeps a half-typed comment when the composer is unmounted and shown again', async () => {
		// The Changes tab is a `v-if`, so it unmounts this component.
		const first = renderComponent({ props: { canComment: true } });
		await userEvent.type(first.getByRole('textbox'), 'half a thought');
		first.unmount();

		const second = renderComponent({ props: { canComment: true } });

		expect(second.getByRole('textbox')).toHaveValue('half a thought');
	});

	it('disables the send button and the textarea when the viewer cannot comment', () => {
		const { getByTestId, getByRole } = renderComponent({ props: { canComment: false } });

		expect(getByTestId('send-message-button')).toBeDisabled();
		expect(getByRole('textbox')).toBeDisabled();
	});

	it('disables only the send button while the draft is empty', () => {
		const { getByTestId, getByRole } = renderComponent({ props: { canComment: true } });

		expect(getByTestId('send-message-button')).toBeDisabled();
		expect(getByRole('textbox')).not.toBeDisabled();
	});

	it('enables the send button once the draft has content', async () => {
		const { getByTestId, getByRole } = renderComponent({ props: { canComment: true } });

		await userEvent.type(getByRole('textbox'), 'Nice work');

		await waitFor(() => expect(getByTestId('send-message-button')).not.toBeDisabled());
	});

	it('disables the send button once the draft goes over the length limit', async () => {
		const { getByTestId, getByRole } = renderComponent({ props: { canComment: true } });
		const textarea = getByRole('textbox');

		textarea.focus();
		await userEvent.paste('x'.repeat(WORKFLOW_REVIEW_COMMENT_MAX_LENGTH));
		await waitFor(() => expect(getByTestId('send-message-button')).not.toBeDisabled());
		// Shift+Enter inserts the newline itself, so `maxlength` on the textarea does not stop it
		await userEvent.keyboard('{Shift>}{Enter}{/Shift}');

		expect(textarea).toHaveValue(`${'x'.repeat(WORKFLOW_REVIEW_COMMENT_MAX_LENGTH)}\n`);
		await waitFor(() => expect(getByTestId('send-message-button')).toBeDisabled());
	});

	it('posts the draft and clears it', async () => {
		const { getByTestId, getByRole } = renderComponent({ props: { canComment: true } });
		const textarea = getByRole('textbox');

		await userEvent.type(textarea, 'Nice work');
		await userEvent.click(getByTestId('send-message-button'));

		expect(store.postComment).toHaveBeenCalledWith('Nice work');
		await waitFor(() => expect(textarea).toHaveValue(''));
	});

	it('keeps text typed while the previous comment was still posting', async () => {
		let resolvePost!: () => void;
		store.postComment.mockImplementation(
			async () =>
				await new Promise<void>((resolve) => {
					resolvePost = resolve;
				}),
		);
		const { getByTestId, getByRole } = renderComponent({ props: { canComment: true } });
		const textarea = getByRole('textbox');

		await userEvent.type(textarea, 'Nice work');
		await userEvent.click(getByTestId('send-message-button'));
		// The textarea stays enabled during the request, so the user keeps typing
		await userEvent.type(textarea, ' and the next one');
		expect(store.postComment).toHaveBeenCalledWith('Nice work');
		resolvePost();
		await new Promise(setImmediate);

		expect(textarea).toHaveValue('Nice work and the next one');
	});

	it('keeps the draft and surfaces an error when posting fails', async () => {
		store.postComment.mockRejectedValue(new Error('boom'));
		const { getByTestId, getByRole } = renderComponent({ props: { canComment: true } });
		const textarea = getByRole('textbox');

		await userEvent.type(textarea, 'Nice work');
		await userEvent.click(getByTestId('send-message-button'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Could not post comment'),
		);
		expect(textarea).toHaveValue('Nice work');
	});
});
