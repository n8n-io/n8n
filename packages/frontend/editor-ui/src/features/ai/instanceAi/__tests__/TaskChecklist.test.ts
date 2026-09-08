import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import TaskChecklist from '../components/TaskChecklist.vue';

const renderComponent = createComponentRenderer(TaskChecklist);

describe('TaskChecklist', () => {
	it('renders the description of each task', () => {
		const { getByText } = renderComponent({
			props: {
				tasks: { tasks: [{ id: 't1', description: 'Create the Users table', status: 'todo' }] },
			},
		});

		expect(getByText('Create the Users table')).toBeInTheDocument();
	});

	it('labels a task whose description is blank', () => {
		const { getByText } = renderComponent({
			props: { tasks: { tasks: [{ id: 't1', description: '  ', status: 'todo' }] } },
		});

		expect(getByText('Untitled task')).toBeInTheDocument();
	});
});
