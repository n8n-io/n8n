import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { VIEWS } from '@/app/constants';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { launchWorkflowThread } from './launchWorkflowThread';

const fetchWorkflow = vi.fn();
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ fetchWorkflow }),
}));

const provisionLaunchedThread = vi.fn();
const ensurePersonalProjectId = vi.fn();
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	provisionLaunchedThread: (...args: unknown[]) => provisionLaunchedThread(...args),
	ensurePersonalProjectId: () => ensurePersonalProjectId(),
}));

describe('launchWorkflowThread', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		fetchWorkflow.mockResolvedValue({
			id: 'wf1',
			name: 'Gmail fetch',
			homeProject: { id: 'p1' },
		});
		provisionLaunchedThread.mockResolvedValue('thread-1');
		ensurePersonalProjectId.mockResolvedValue('personal-1');
	});

	it('ignores a query with no workflowId', async () => {
		await expect(launchWorkflowThread({ templateId: '1234' })).resolves.toBeUndefined();
		expect(fetchWorkflow).not.toHaveBeenCalled();
	});

	it('rejects a malformed workflow id without fetching', async () => {
		await expect(launchWorkflowThread({ workflowId: 'not valid!' })).resolves.toEqual({
			name: INSTANCE_AI_VIEW,
		});
		expect(fetchWorkflow).not.toHaveBeenCalled();
	});

	it('falls back to the manual editor when the fetch fails', async () => {
		fetchWorkflow.mockRejectedValue(new Error('403'));
		await expect(launchWorkflowThread({ workflowId: 'wf1' })).resolves.toEqual({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf1' },
		});
	});

	// `homeProject` is absent when workflow sharing is not licensed.
	it('uses the personal project when the workflow has no home project', async () => {
		fetchWorkflow.mockResolvedValue({ id: 'wf1', name: 'Gmail fetch', homeProject: null });
		await expect(launchWorkflowThread({ workflowId: 'wf1' })).resolves.toEqual({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-1' },
		});
		expect(provisionLaunchedThread).toHaveBeenCalledWith(
			'personal-1',
			expect.anything(),
			expect.anything(),
		);
	});

	it('falls back to the manual editor when no project can be resolved', async () => {
		fetchWorkflow.mockResolvedValue({ id: 'wf1', name: 'Gmail fetch', homeProject: null });
		ensurePersonalProjectId.mockResolvedValue(null);
		await expect(launchWorkflowThread({ workflowId: 'wf1' })).resolves.toEqual({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf1' },
		});
	});

	it('provisions a thread with the fetched name and redirects to the thread view', async () => {
		await expect(launchWorkflowThread({ workflowId: 'wf1' })).resolves.toEqual({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-1' },
		});
		expect(provisionLaunchedThread).toHaveBeenCalledWith(
			'p1',
			{
				message: '',
				attachments: [{ type: 'workflow', id: 'wf1', name: 'Gmail fetch' }],
			},
			{
				source: 'workflow_list_auto',
				origin: 'internal',
				sourceContext: { workflowId: 'wf1' },
			},
		);
	});

	it('honors the deliberate button source', async () => {
		await launchWorkflowThread({ workflowId: 'wf1', source: 'workflow_list_button' });
		expect(provisionLaunchedThread).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ source: 'workflow_list_button' }),
		);
	});

	it('falls back to the manual editor when provisioning fails', async () => {
		provisionLaunchedThread.mockResolvedValue(null);
		await expect(launchWorkflowThread({ workflowId: 'wf1' })).resolves.toEqual({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf1' },
		});
	});
});
