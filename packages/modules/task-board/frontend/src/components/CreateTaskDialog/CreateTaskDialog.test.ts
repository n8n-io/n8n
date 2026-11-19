import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, screen } from '@testing-library/vue';

import CreateTaskDialog from './CreateTaskDialog.vue';
import { addTag, chooseOption } from '../../__tests__/fixtures';

const renderDialog = createComponentRenderer(CreateTaskDialog, {
	props: {
		open: true,
		creating: false,
		assigneeItems: [{ value: 'unassigned', label: 'Unassigned' }],
		tagSuggestions: ['api', 'docs'],
	},
});

describe('CreateTaskDialog', () => {
	it('creates a task with the severity and the tags that the user set', async () => {
		const { emitted } = renderDialog();

		await fireEvent.update(await screen.findByTestId('task-board-new-task-title'), 'Fix login');
		await chooseOption('task-board-new-task-severity', 'High');
		await addTag('task-board-new-task-tags', 'Bug');
		// A tag that the board already uses is one click away.
		await fireEvent.click(screen.getByRole('button', { name: 'api' }));
		await fireEvent.click(screen.getByTestId('task-board-new-task-submit'));

		expect(emitted('submit')).toEqual([
			[
				{
					title: 'Fix login',
					description: undefined,
					assignee: undefined,
					severity: 'high',
					tags: ['bug', 'api'],
				},
			],
		]);
	});

	it('does not offer a tag again after the user added it', async () => {
		renderDialog();

		await fireEvent.click(await screen.findByRole('button', { name: 'api' }));

		expect(screen.queryByRole('button', { name: 'api' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'docs' })).toBeInTheDocument();
	});

	it('does not create a task without a title', async () => {
		const { emitted } = renderDialog();

		await fireEvent.click(await screen.findByTestId('task-board-new-task-submit'));

		expect(screen.getByTestId('task-board-new-task-submit')).toBeDisabled();
		expect(emitted('submit')).toBeUndefined();
	});
});
