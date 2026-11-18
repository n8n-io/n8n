import type { TaskBoardColumn as Column } from '@n8n/api-types';
import { createEvent, fireEvent, render } from '@testing-library/vue';

import TaskBoardColumn from './TaskBoardColumn.vue';
import { TASK_DRAG_TYPE } from '../../task-board.constants';

const column: Column = { id: 'done', boardId: 'b1', name: 'Done', position: 1, role: 'done' };

/** jsdom has no `DataTransfer`. This holds what the column reads from one. */
const dragData = (data: Record<string, string>) => ({
	dataTransfer: {
		types: Object.keys(data),
		getData: (type: string) => data[type] ?? '',
	},
});

/** Dispatches a `dragover` and says if the column cancelled it, which is what allows a drop. */
function dragOverIsAccepted(target: HTMLElement, data: ReturnType<typeof dragData>) {
	const event = createEvent.dragOver(target, data);
	target.dispatchEvent(event);
	return event.defaultPrevented;
}

const renderColumn = () =>
	render(TaskBoardColumn, { props: { column, tasks: [], selectedTaskId: undefined } });

describe('TaskBoardColumn', () => {
	it('emits the id of a task card that is dropped on the column', async () => {
		const { getByTestId, emitted } = renderColumn();

		await fireEvent.drop(getByTestId('task-board-column'), dragData({ [TASK_DRAG_TYPE]: 't1' }));

		expect(emitted('dropTask')).toEqual([['t1']]);
	});

	it('accepts the drag of a task card, so the browser allows the drop', () => {
		const { getByTestId } = renderColumn();

		const accepted = dragOverIsAccepted(
			getByTestId('task-board-column'),
			dragData({ [TASK_DRAG_TYPE]: 't1' }),
		);

		expect(accepted).toBe(true);
	});

	it('refuses a drag that is not a task card, such as a file or text', async () => {
		const { getByTestId, emitted } = renderColumn();
		const target = getByTestId('task-board-column');
		const text = dragData({ 'text/plain': 't1' });

		const accepted = dragOverIsAccepted(target, text);
		await fireEvent.drop(target, text);

		expect(accepted).toBe(false);
		expect(emitted('dropTask')).toBeUndefined();
	});
});
