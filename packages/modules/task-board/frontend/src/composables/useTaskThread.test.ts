import { waitAllPromises } from '@n8n/frontend-test-utils';

import { useTaskThread } from './useTaskThread';
import { createTask, withSetup } from '../__tests__/fixtures';
import { createTaskComment, fetchTask } from '../task-board.api';

vi.mock('../task-board.api');

const taskRef = { projectId: 'p1', boardId: 'b1', taskId: 't1' };

describe('useTaskThread', () => {
	beforeEach(() => vi.resetAllMocks());

	it('posts the draft, shows the new comment in the thread and clears the draft', async () => {
		vi.mocked(fetchTask).mockResolvedValue({ ...createTask(), comments: [] });
		vi.mocked(createTaskComment).mockResolvedValue({
			id: 'c1',
			taskId: 't1',
			author: { type: 'user', id: 'u1', name: 'Ada' },
			body: 'Use Postgres',
			createdAt: '2026-01-02T00:00:00.000Z',
		});
		const thread = withSetup(() => useTaskThread(taskRef));
		await waitAllPromises();

		thread.draft.value = '  Use Postgres  ';
		await thread.addComment();

		expect(createTaskComment).toHaveBeenCalledWith(expect.anything(), taskRef, {
			body: 'Use Postgres',
		});
		expect(thread.comments.value.map((comment) => comment.body)).toEqual(['Use Postgres']);
		expect(thread.draft.value).toBe('');
	});
});
