import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflowTriggers, ErrorReporter } from 'n8n-core';

import { PublicationTriggerDeactivator } from '@/workflows/publication/publication-trigger-deactivator';
import type { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';

describe('PublicationTriggerDeactivator', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const lifecycleLock = mock<WorkflowPublicationLifecycleLock>();
	const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();

	function createDeactivator(useWorkflowPublicationService = true) {
		const workflowsConfig = mock<WorkflowsConfig>({
			useWorkflowPublicationService,
			triggerLifecycleStepdownTimeoutMs: 30_000,
		});
		return new PublicationTriggerDeactivator(
			logger,
			workflowsConfig,
			errorReporter,
			lifecycleLock,
			activeWorkflowTriggers,
		);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		lifecycleLock.isLocked.mockReturnValue(false);
		// By default the lock runs the teardown immediately without timing out.
		lifecycleLock.runExclusiveOrTimeout.mockImplementation(async (_workflowId, fn) => {
			await fn();
			return { timedOut: false };
		});
	});

	test('does nothing when the publication service is disabled', async () => {
		await createDeactivator(false).deactivateAllNonWebhookTriggers();

		expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).not.toHaveBeenCalled();
		expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
		expect(lifecycleLock.runExclusiveOrTimeout).not.toHaveBeenCalled();
	});

	test('deactivates each workflow under its lock', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1', 'wf-2']);

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		expect(lifecycleLock.runExclusiveOrTimeout).toHaveBeenCalledWith(
			'wf-1',
			expect.any(Function),
			30_000,
		);
		expect(lifecycleLock.runExclusiveOrTimeout).toHaveBeenCalledWith(
			'wf-2',
			expect.any(Function),
			30_000,
		);
		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-1');
		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-2');
		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	test('defers a locked workflow and deactivates it last', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([
			'wf-free',
			'wf-locked',
		]);
		lifecycleLock.isLocked.mockImplementation((workflowId) => workflowId === 'wf-locked');

		const removed: string[] = [];
		activeWorkflowTriggers.remove.mockImplementation(async (workflowId) => {
			removed.push(workflowId);
			return true;
		});

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		// Both go through the lock, but the locked workflow is handled last.
		expect(removed).toEqual(['wf-free', 'wf-locked']);
		expect(lifecycleLock.runExclusiveOrTimeout).toHaveBeenCalledTimes(2);
	});

	test('reports when a locked workflow times out but still tears it down', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-stuck']);
		lifecycleLock.isLocked.mockReturnValue(true);
		lifecycleLock.runExclusiveOrTimeout.mockImplementation(async (_workflowId, fn) => {
			await fn();
			return { timedOut: true };
		});

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-stuck');
		expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error), { shouldBeLogged: true });
	});
});
