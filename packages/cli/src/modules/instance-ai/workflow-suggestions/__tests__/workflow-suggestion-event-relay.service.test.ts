import type { Logger } from '@n8n/backend-common';
import { EventService, WorkflowMutationHooksProxy } from '@n8n/backend-services';
import type { IWorkflowDb } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { RelayEventMap } from '@/events/maps/relay.event-map';

import { WorkflowSuggestionEventRelay } from '../workflow-suggestion-event-relay.service';
import type { WorkflowSuggestionService } from '../workflow-suggestion.service';

const suggestions = mock<WorkflowSuggestionService>();
const logger = mock<Logger>();
let events: EventService;
let hooks: WorkflowMutationHooksProxy;

function save(workflowId: string) {
	events.emit(
		'workflow-saved',
		mock<RelayEventMap['workflow-saved']>({ workflow: mock<IWorkflowDb>({ id: workflowId }) }),
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.resetAllMocks();
	suggestions.reconcileWorkflow.mockResolvedValue();
	events = new EventService();
	hooks = new WorkflowMutationHooksProxy(logger);
	hooks.registerProvider(new WorkflowSuggestionEventRelay(events, suggestions, logger));
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
});

it('coalesces saves until thirty seconds after the last save', async () => {
	save('first');
	await vi.advanceTimersByTimeAsync(15_000);
	save('first');
	await vi.advanceTimersByTimeAsync(29_999);
	expect(suggestions.reconcileWorkflow).not.toHaveBeenCalled();

	await vi.advanceTimersByTimeAsync(1);

	expect(suggestions.reconcileWorkflow).toHaveBeenCalledExactlyOnceWith('first');
	expect(vi.getTimerCount()).toBe(0);
});

it('handles other workflows and later saves while a check is still running', async () => {
	const firstCheck = createDeferredPromise();
	suggestions.reconcileWorkflow.mockReturnValueOnce(firstCheck.promise);
	save('first');
	await vi.advanceTimersByTimeAsync(15_000);
	save('second');
	await vi.advanceTimersByTimeAsync(15_000);
	expect(suggestions.reconcileWorkflow).toHaveBeenCalledExactlyOnceWith('first');

	save('first');
	await vi.advanceTimersByTimeAsync(15_000);
	expect(suggestions.reconcileWorkflow).toHaveBeenNthCalledWith(2, 'second');
	await vi.advanceTimersByTimeAsync(15_000);
	expect(suggestions.reconcileWorkflow).toHaveBeenNthCalledWith(3, 'first');
	expect(suggestions.reconcileWorkflow).toHaveBeenCalledTimes(3);
	expect(vi.getTimerCount()).toBe(0);
	firstCheck.resolve();
});

it('checks within sixty seconds when saves continue', async () => {
	save('first');
	for (let index = 0; index < 3; index++) {
		await vi.advanceTimersByTimeAsync(15_000);
		save('first');
	}
	await vi.advanceTimersByTimeAsync(14_999);
	expect(suggestions.reconcileWorkflow).not.toHaveBeenCalled();

	await vi.advanceTimersByTimeAsync(1);

	expect(suggestions.reconcileWorkflow).toHaveBeenCalledExactlyOnceWith('first');
	expect(vi.getTimerCount()).toBe(0);
});

it.each(['publish', 'unpublish', 'archive'] as const)(
	'checks immediately on %s and cancels only that workflow’s pending save',
	async (eventName) => {
		save('first');
		save('second');
		await vi.advanceTimersByTimeAsync(15_000);

		if (eventName === 'publish') {
			await hooks.afterWorkflowPublished({ workflowId: 'first', versionId: 'v1', userId: 'user' });
		} else if (eventName === 'archive') {
			await hooks.afterWorkflowArchived('first', 'user');
		} else {
			events.emit(
				'workflow-deactivated',
				mock<RelayEventMap['workflow-deactivated']>({ workflowId: 'first' }),
			);
		}

		expect(suggestions.reconcileWorkflow).toHaveBeenCalledExactlyOnceWith('first');
		await vi.advanceTimersByTimeAsync(15_000);
		expect(suggestions.reconcileWorkflow).toHaveBeenNthCalledWith(2, 'second');
		await vi.advanceTimersByTimeAsync(60_000);
		expect(suggestions.reconcileWorkflow).toHaveBeenCalledTimes(2);
	},
);

it.each(['save', 'publish', 'unpublish', 'archive'] as const)(
	'logs a failed %s check and accepts later saves',
	async (eventName) => {
		const error = new Error('Reconciliation unavailable.');
		suggestions.reconcileWorkflow.mockRejectedValueOnce(error);
		if (eventName === 'save') {
			save('first');
		} else if (eventName === 'publish') {
			await hooks.afterWorkflowPublished({ workflowId: 'first', versionId: 'v1', userId: 'user' });
		} else if (eventName === 'archive') {
			await hooks.afterWorkflowArchived('first', 'user');
		} else {
			events.emit(
				'workflow-deactivated',
				mock<RelayEventMap['workflow-deactivated']>({ workflowId: 'first' }),
			);
		}
		await vi.advanceTimersByTimeAsync(30_000);

		expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
			'Could not reconcile workflow suggestions',
			{
				workflowId: 'first',
				error,
			},
		);
		save('first');
		await vi.advanceTimersByTimeAsync(30_000);
		expect(suggestions.reconcileWorkflow).toHaveBeenCalledTimes(2);
		expect(logger.warn).toHaveBeenCalledOnce();
	},
);

it('uses hooks instead of activation and archive events', () => {
	events.emit(
		'workflow-activated',
		mock<RelayEventMap['workflow-activated']>({ workflowId: 'first' }),
	);
	events.emit(
		'workflow-archived',
		mock<RelayEventMap['workflow-archived']>({ workflowId: 'first' }),
	);

	expect(suggestions.reconcileWorkflow).not.toHaveBeenCalled();
});
