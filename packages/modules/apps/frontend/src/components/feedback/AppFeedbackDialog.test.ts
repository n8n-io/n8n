import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import { testApp } from '../../__tests__/fixtures';
import { sendAppFeedback } from '../../apps.api';
import AppFeedbackDialog from './AppFeedbackDialog.vue';

vi.mock('../../apps.api');
const showMessage = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));

const renderComponent = createComponentRenderer(AppFeedbackDialog, {
	props: { open: true, app: testApp() },
});

describe('AppFeedbackDialog', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('cannot send until the user writes feedback', async () => {
		renderComponent();

		expect(await screen.findByTestId('app-feedback-send')).toBeDisabled();
		await userEvent.type(screen.getByTestId('app-feedback-input'), '   ');
		expect(screen.getByTestId('app-feedback-send')).toBeDisabled();
	});

	it('sends the category and the trimmed feedback, then closes', async () => {
		vi.mocked(sendAppFeedback).mockResolvedValue({ submissionId: 'submission-1' });
		const { emitted } = renderComponent();

		await userEvent.click(await screen.findByText('Idea'));
		await userEvent.type(screen.getByTestId('app-feedback-input'), '  Add a dark theme  ');
		await userEvent.click(screen.getByTestId('app-feedback-send'));

		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		expect(sendAppFeedback).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', {
			category: 'idea',
			feedback: 'Add a dark theme',
		});
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('keeps the dialog open and shows the error when sending fails', async () => {
		vi.mocked(sendAppFeedback).mockRejectedValue(new Error('Could not send your feedback.'));
		const { emitted } = renderComponent();

		await userEvent.type(await screen.findByTestId('app-feedback-input'), 'The preview is blank');
		await userEvent.click(screen.getByTestId('app-feedback-send'));

		expect(await screen.findByTestId('app-feedback-error')).toHaveTextContent(
			'Could not send your feedback.',
		);
		expect(emitted('update:open')).toBeUndefined();
		expect(screen.getByTestId('app-feedback-input')).toHaveValue('The preview is blank');
	});
});
