import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ActivityEventRepository, Project, SharedWorkflowRepository } from '@n8n/db';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { ActivityLogEventRelay } from '@/events/relays/activity-log.event-relay';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

const user = { id: 'user123' };

/**
 * A plain object, not `mock<IRun>()`: an auto-mocked `waitTill` is a truthy proxy, which makes
 * `determineFinalExecutionStatus` call every run `waiting` and the relay skip it.
 */
function runData(overrides: Partial<IRun> = {}): IRun {
	return {
		mode: 'trigger',
		status: 'success',
		finished: true,
		startedAt: new Date(),
		waitTill: null,
		data: { resultData: { runData: {} } },
		...overrides,
	} as IRun;
}

describe('ActivityLogEventRelay', () => {
	const activityEventRepository = mock<ActivityEventRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const logger = mock<Logger>();
	let eventService: EventService;

	function createRelay(activityLogEnabled = true) {
		eventService = new EventService();
		const globalConfig = mock<GlobalConfig>({ instanceAi: { activityLogEnabled } });
		const relay = new ActivityLogEventRelay(
			eventService,
			activityEventRepository,
			sharedWorkflowRepository,
			globalConfig,
			logger,
		);
		relay.init();
		return relay;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
			mock<Project>({ id: 'project123' }),
		);
		createRelay();
	});

	it('registers no listeners when the activity log is disabled', async () => {
		vi.clearAllMocks();
		createRelay(false);

		eventService.emit('workflow-created', {
			user,
			workflow: mock<IWorkflowBase>({ id: 'wf1', name: 'Lead enrichment', nodes: [] }),
			publicApi: false,
			projectId: 'project123',
			projectType: 'team',
		});

		await flushPromises();

		expect(activityEventRepository.record).not.toHaveBeenCalled();
	});

	it('records a save with the node delta and the resolved project', async () => {
		eventService.emit('workflow-saved', {
			user,
			workflow: mock({ id: 'wf1', name: 'Lead enrichment', nodes: [mock(), mock(), mock()] }),
			previousWorkflow: mock({ id: 'wf1', nodes: [mock()] }),
			publicApi: false,
		} as RelayEventMap['workflow-saved']);

		await flushPromises();

		expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenCalledWith('wf1');
		expect(activityEventRepository.record).toHaveBeenCalledWith({
			category: 'workflow',
			action: 'saved',
			userId: 'user123',
			projectId: 'project123',
			resourceType: 'workflow',
			resourceId: 'wf1',
			resourceName: 'Lead enrichment',
			data: { nodeCount: 3, nodeDelta: 2 },
		});
	});

	it('records a failed run with the node that broke it', async () => {
		eventService.emit('workflow-post-execute', {
			executionId: 'exec1',
			userId: 'user123',
			workflow: mock({ id: 'wf1', name: 'Lead enrichment' }),
			projectId: 'project123',
			runData: runData({
				status: 'error',
				finished: false,
				data: {
					resultData: {
						runData: {},
						lastNodeExecuted: 'HTTP Request',
						error: { message: 'boom' },
					},
				} as unknown as IRun['data'],
			}),
		} as RelayEventMap['workflow-post-execute']);

		await flushPromises();

		expect(activityEventRepository.record).toHaveBeenCalledWith(
			expect.objectContaining({
				category: 'execution',
				action: 'failed',
				resourceId: 'wf1',
				data: expect.objectContaining({
					executionId: 'exec1',
					status: 'error',
					failedNode: 'HTTP Request',
				}),
			}),
		);
	});

	it('files an evaluation run under its own category so it cannot bury the window', async () => {
		eventService.emit('workflow-post-execute', {
			executionId: 'exec2',
			workflow: mock({ id: 'wf1', name: 'Lead enrichment' }),
			projectId: 'project123',
			runData: runData({ mode: 'evaluation' }),
		} as RelayEventMap['workflow-post-execute']);

		await flushPromises();

		expect(activityEventRepository.record).toHaveBeenCalledWith(
			expect.objectContaining({ category: 'eval', action: 'succeeded' }),
		);
	});

	it('ignores a run that is paused rather than finished', async () => {
		eventService.emit('workflow-post-execute', {
			executionId: 'exec3',
			workflow: mock({ id: 'wf1', name: 'Lead enrichment' }),
			runData: runData({ finished: false, waitTill: new Date() }),
		} as RelayEventMap['workflow-post-execute']);

		await flushPromises();

		expect(activityEventRepository.record).not.toHaveBeenCalled();
	});

	it('records a deletion without resolving a project, since the workflow is already gone', async () => {
		eventService.emit('workflow-deleted', { user, workflowId: 'wf1', publicApi: false });

		await flushPromises();

		expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(activityEventRepository.record).toHaveBeenCalledWith({
			category: 'workflow',
			action: 'deleted',
			userId: 'user123',
			resourceType: 'workflow',
			resourceId: 'wf1',
		});
	});

	it('shows a credential by its type, which is all the event carries', async () => {
		eventService.emit('credentials-created', {
			user,
			credentialType: 'slackApi',
			credentialId: 'cred1',
			publicApi: false,
			projectId: 'project123',
		});

		await flushPromises();

		expect(activityEventRepository.record).toHaveBeenCalledWith({
			category: 'credential',
			action: 'created',
			userId: 'user123',
			projectId: 'project123',
			resourceType: 'credential',
			resourceId: 'cred1',
			resourceName: 'slackApi',
		});
	});

	it('swallows a repository failure so the recorded operation still succeeds', async () => {
		activityEventRepository.record.mockRejectedValueOnce(new Error('disk full'));

		eventService.emit('workflow-deleted', { user, workflowId: 'wf1', publicApi: false });

		await flushPromises();

		expect(logger.debug).toHaveBeenCalledWith(
			'Failed to record activity entry',
			expect.objectContaining({ category: 'workflow', action: 'deleted' }),
		);
	});
});
