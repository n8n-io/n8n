import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { SettingsRepository, UserRepository } from '@n8n/db';
import type { EndedExecutionItem, ListEndedExecutionsResponse } from '@n8n/engine';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@n8n/backend-services';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';

import type { EngineDataPlaneClient } from '../engine-data-plane-client';
import { EngineV2EndedExecutionFeed } from '../ended-feed/ended-execution-feed';

const item = (overrides: Partial<EndedExecutionItem> = {}): EndedExecutionItem => ({
	eventKey: 'exec-1:ended',
	id: 'exec-1',
	workflowId: 'wf-1',
	workflowName: 'Orders',
	status: 'completed',
	mode: 'production',
	hostMode: 'webhook',
	userId: 'user-1',
	projectId: 'project-1',
	parent: null,
	createdAt: '2026-11-23T10:00:00.000Z',
	finishedAt: '2026-11-23T10:00:02.000Z',
	failedStep: null,
	...overrides,
});

const page = (items: EndedExecutionItem[]): ListEndedExecutionsResponse => ({
	items,
	cursor: items.length
		? { finishedAt: items.at(-1)!.finishedAt, id: items.at(-1)!.id }
		: { finishedAt: '2026-11-23T09:00:00.000Z', id: 'stored' },
});

describe('EngineV2EndedExecutionFeed', () => {
	const client = mock<EngineDataPlaneClient>();
	const settings = mock<SettingsRepository>();
	const eventBus = mock<MessageEventBus>();
	let feed: EngineV2EndedExecutionFeed;

	beforeEach(() => {
		vi.resetAllMocks();
		const eventService = new EventService();
		// The real relay, so the test shows what a log streaming destination receives.
		new LogStreamingEventRelay(
			eventService,
			eventBus,
			mock<InstanceSettings>(),
			mock<UserRepository>(),
			mock<AgentsConfig>(),
		).init();
		feed = new EngineV2EndedExecutionFeed(
			mockLogger(),
			client,
			settings,
			eventService,
			mock<InstanceSettings>({ isLeader: true }),
		);
		settings.findByKey.mockResolvedValue(null);
	});

	it('sends the v1 workflow events for ended v2 executions, then stores the cursor', async () => {
		const failed = item({
			eventKey: 'exec-2:ended',
			id: 'exec-2',
			status: 'failed',
			failedStep: {
				nodeId: 'node-c',
				nodeName: 'Charge card',
				nodeType: 'n8n-nodes-base.httpRequest',
				error: { name: 'Error', message: 'card declined' },
			},
		});
		client.listEndedExecutions.mockResolvedValueOnce(page([item(), failed]));

		await feed.poll();

		expect(eventBus.sendWorkflowEvent).toHaveBeenNthCalledWith(1, {
			eventName: 'n8n.workflow.success',
			payload: expect.objectContaining({
				executionId: 'exec-1',
				workflowId: 'wf-1',
				workflowName: 'Orders',
				userId: 'user-1',
				projectId: 'project-1',
				mode: 'webhook',
			}),
		});
		expect(eventBus.sendWorkflowEvent).toHaveBeenNthCalledWith(2, {
			eventName: 'n8n.workflow.failed',
			payload: expect.objectContaining({
				executionId: 'exec-2',
				errorMessage: 'card declined',
				lastNodeExecuted: 'Charge card',
				errorNodeType: 'n8n-nodes-base.httpRequest',
			}),
		});
		expect(settings.upsertByKey).toHaveBeenCalledWith(
			'engineV2.endedExecutionFeed.cursor',
			JSON.stringify({ finishedAt: failed.finishedAt, id: 'exec-2' }),
			false,
			{},
		);
	});

	it('resumes from the stored cursor', async () => {
		const stored = { finishedAt: '2026-11-23T09:00:00.000Z', id: 'stored' };
		settings.findByKey.mockResolvedValue(mock({ value: JSON.stringify(stored) }));
		client.listEndedExecutions.mockResolvedValueOnce(page([]));

		await feed.poll();

		expect(client.listEndedExecutions).toHaveBeenCalledWith({ after: stored, limit: 200 });
		expect(settings.upsertByKey).not.toHaveBeenCalled();
	});

	it('keeps the cursor when the cursor store fails, so the next poll repeats the page', async () => {
		client.listEndedExecutions.mockResolvedValue(page([item()]));
		settings.upsertByKey.mockRejectedValueOnce(new Error('database down'));

		await expect(feed.poll()).rejects.toThrow('database down');
		await feed.poll();

		expect(client.listEndedExecutions).toHaveBeenLastCalledWith({ after: undefined, limit: 200 });
		expect(eventBus.sendWorkflowEvent).toHaveBeenCalledTimes(2);
	});
});
