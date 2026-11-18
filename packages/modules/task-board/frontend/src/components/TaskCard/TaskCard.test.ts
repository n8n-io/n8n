import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent } from '@testing-library/vue';

import TaskCard from './TaskCard.vue';
import { createTask } from '../../__tests__/fixtures';

const renderCard = createComponentRenderer(TaskCard, { props: { selected: false } });

const usage = (totalTokens: number, cost: number | null) => ({
	promptTokens: totalTokens,
	completionTokens: 0,
	totalTokens,
	cost,
});

describe('TaskCard', () => {
	it('shows the severity of the task as a badge', () => {
		const { getByTestId } = renderCard({ props: { task: createTask({ severity: 'critical' }) } });

		const badge = getByTestId('task-board-severity-badge');
		expect(badge).toHaveTextContent('Critical');
		expect(badge).toHaveAttribute('data-severity', 'critical');
	});

	it('shows no severity badge and no tags for a task that has none', () => {
		const { queryByTestId } = renderCard({ props: { task: createTask() } });

		expect(queryByTestId('task-board-severity-badge')).not.toBeInTheDocument();
		expect(queryByTestId('task-board-task-tags')).not.toBeInTheDocument();
	});

	it('shows three tags and counts the rest', () => {
		const { getAllByTestId, getByTestId } = renderCard({
			props: { task: createTask({ tags: ['bug', 'api', 'billing', 'docs', 'ui'] }) },
		});

		expect(getAllByTestId('task-board-task-tag').map((tag) => tag.textContent)).toEqual([
			'bug',
			'api',
			'billing',
		]);
		expect(getByTestId('task-board-task-tags-more')).toHaveTextContent('+2');
	});

	it('shows the tokens in compact form with the price beside them', () => {
		const { getByTestId } = renderCard({
			props: { task: createTask({ usage: usage(12_400, 0.04) }) },
		});

		expect(getByTestId('task-board-task-usage-tokens')).toHaveTextContent('12.4k tokens');
		expect(getByTestId('task-board-task-usage-cost')).toHaveTextContent('$0.04');
	});

	it('shows the tokens without a price when no provider reported one', () => {
		const { getByTestId, queryByTestId } = renderCard({
			props: { task: createTask({ usage: usage(950, null) }) },
		});

		expect(getByTestId('task-board-task-usage-tokens')).toHaveTextContent('950 tokens');
		expect(queryByTestId('task-board-task-usage-cost')).not.toBeInTheDocument();
	});

	it('shows no usage for a task that no agent ran on', () => {
		const { queryByTestId } = renderCard({ props: { task: createTask() } });

		expect(queryByTestId('task-board-task-usage')).not.toBeInTheDocument();
	});

	it('selects the task on a click on the card, but not on a click on the link to its page', async () => {
		const { getByTestId, emitted } = renderCard({
			props: { task: createTask(), to: '/projects/p1/tasks/b1/task/t1' },
		});

		await fireEvent.click(getByTestId('task-board-task-card-link'));
		expect(emitted('select')).toBeUndefined();

		await fireEvent.click(getByTestId('task-board-task-card'));
		expect(emitted('select')).toHaveLength(1);
	});
});
