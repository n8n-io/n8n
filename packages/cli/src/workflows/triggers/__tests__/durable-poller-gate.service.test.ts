import type {
	PollerStateRepository,
	WorkflowEntity,
	WorkflowHistory,
	WorkflowRepository,
} from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';
import { DurablePollerGateService } from '@/workflows/triggers/durable-poller-gate.service';
import type {
	PublishedWorkflowData,
	WorkflowPublishedDataService,
} from '@/workflows/workflow-published-data.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';

import { createNodeTypes, logger, node } from './trigger-test-utils';

describe('DurablePollerGateService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const publishedDataService = mock<WorkflowPublishedDataService>();
	const pollerStateRepository = mock<PollerStateRepository>();
	const telemetry = mock<Telemetry>();
	// Real validation service: only `validateTriggerNodeIds` is exercised, which
	// touches none of the constructor dependencies.
	const validationService = new WorkflowValidationService(mock(), mock(), mock(), mock());
	const nodeTypes = createNodeTypes();

	const buildService = () =>
		new DurablePollerGateService(
			logger,
			workflowRepository,
			publishedDataService,
			validationService,
			nodeTypes,
			pollerStateRepository,
			telemetry,
		);

	const published = (nodes: INode[]): PublishedWorkflowData => ({
		workflow: mock<WorkflowEntity>(),
		publishedVersion: mock<WorkflowHistory>({ nodes, connections: {} }),
	});

	/** Declares the active workflows and their published nodes; `null` = active but no published version. */
	const givenActiveWorkflows = (workflows: Record<string, INode[] | null>) => {
		workflowRepository.getActiveIds.mockResolvedValue(Object.keys(workflows));
		publishedDataService.getPublishedWorkflowData.mockImplementation(async (workflowId) => {
			const nodes = workflows[workflowId];
			return await Promise.resolve(nodes ? published(nodes) : null);
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('blocks durable pollers until the first scan has run', () => {
		expect(buildService().allowed).toBe(false);
	});

	describe('init', () => {
		it('allows durable pollers when no workflow is active', async () => {
			givenActiveWorkflows({});
			const service = buildService();

			await service.init();

			expect(service.allowed).toBe(true);
		});

		it('allows durable pollers when all active workflows have unique trigger node ids', async () => {
			givenActiveWorkflows({
				'wf-1': [node('trigger-1', 'poll'), node('trigger-2', 'trigger')],
				// Cursor state is keyed on (workflowId, nodeId), so the same node id
				// in a *different* workflow is not a collision.
				'wf-2': [node('trigger-1', 'poll')],
			});
			const service = buildService();

			await service.init();

			expect(service.allowed).toBe(true);
		});

		it('checks the published version of every active workflow', async () => {
			givenActiveWorkflows({
				'wf-1': [node('trigger-1', 'poll')],
				'wf-2': [node('trigger-2', 'poll')],
			});
			const service = buildService();

			await service.init();

			expect(publishedDataService.getPublishedWorkflowData).toHaveBeenCalledWith('wf-1');
			expect(publishedDataService.getPublishedWorkflowData).toHaveBeenCalledWith('wf-2');
		});

		it('refuses durable pollers when an active workflow has two triggers sharing a node id', async () => {
			givenActiveWorkflows({
				'wf-clean': [node('trigger-1', 'poll')],
				'wf-dup': [
					node('dup-id', 'poll', { name: 'Poll A' }),
					node('dup-id', 'poll', { name: 'Poll B' }),
				],
			});
			const service = buildService();

			await service.init();

			expect(service.allowed).toBe(false);
		});

		it('refuses durable pollers when an active workflow has a trigger without a node id', async () => {
			givenActiveWorkflows({
				'wf-1': [node('', 'poll', { name: 'Poll without id' })],
			});
			const service = buildService();

			await service.init();

			expect(service.allowed).toBe(false);
		});

		it('ignores duplicate ids on non-trigger nodes', async () => {
			givenActiveWorkflows({
				'wf-1': [
					node('dup-id', 'noOp', { name: 'Set A' }),
					node('dup-id', 'noOp', { name: 'Set B' }),
					node('trigger-1', 'poll'),
				],
			});
			const service = buildService();

			await service.init();

			expect(service.allowed).toBe(true);
		});

		it('skips active workflows that have no published version', async () => {
			givenActiveWorkflows({ 'wf-1': null });
			const service = buildService();

			await service.init();

			expect(service.allowed).toBe(true);
		});

		// Cursor usage is sticky: `resolveCursor` prefers an existing `poller_state`
		// row even when durable cursors are off, so closing the gate alone would not
		// stop two duplicate-id nodes from sharing one row. Deleting the offenders'
		// rows makes the fallback to static-data cursors terminal.
		it('deletes the poller_state rows of offending workflows only', async () => {
			givenActiveWorkflows({
				'wf-clean': [node('trigger-1', 'poll')],
				'wf-dup': [
					node('dup-id', 'poll', { name: 'Poll A' }),
					node('dup-id', 'poll', { name: 'Poll B' }),
				],
				'wf-no-id': [node('', 'poll', { name: 'Poll without id' })],
			});
			const service = buildService();

			await service.init();

			expect(pollerStateRepository.deleteWorkflowCursors).toHaveBeenCalledTimes(1);
			expect(pollerStateRepository.deleteWorkflowCursors).toHaveBeenCalledWith([
				'wf-dup',
				'wf-no-id',
			]);
		});

		it('does not touch poller_state, log, or telemetry when every active workflow is clean', async () => {
			givenActiveWorkflows({ 'wf-1': [node('trigger-1', 'poll')] });
			const service = buildService();

			await service.init();

			expect(pollerStateRepository.deleteWorkflowCursors).not.toHaveBeenCalled();
			expect(logger.error).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		// "Log loudly, naming the offending workflows" — the log line is the
		// operator's only pointer to what to fix, so the ids must be in the message
		// itself, not just in metadata.
		it('logs an error naming the offending workflows', async () => {
			givenActiveWorkflows({
				'wf-dup': [
					node('dup-id', 'poll', { name: 'Poll A' }),
					node('dup-id', 'poll', { name: 'Poll B' }),
				],
				'wf-no-id': [node('', 'poll', { name: 'Poll without id' })],
			});
			const service = buildService();

			await service.init();

			expect(logger.error).toHaveBeenCalledTimes(1);
			const [message] = logger.error.mock.calls[0];
			expect(message).toContain('wf-dup');
			expect(message).toContain('wf-no-id');
		});

		// A workflow that cannot be scanned (e.g. an uninstalled community node makes
		// node-type resolution throw) must never crash startup. It cannot be verified
		// either, so the gate stays closed — but its rows are kept: without a scan
		// there is no confirmed duplicate to justify deleting cursor state.
		it('refuses durable pollers without crashing or deleting rows when a workflow cannot be scanned', async () => {
			givenActiveWorkflows({
				'wf-clean': [node('trigger-1', 'poll')],
				'wf-broken': [node('node-1', 'unrecognized'), node('trigger-2', 'poll')],
			});
			const service = buildService();

			await expect(service.init()).resolves.not.toThrow();

			expect(service.allowed).toBe(false);
			expect(pollerStateRepository.deleteWorkflowCursors).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error.mock.calls[0][0]).toContain('wf-broken');
		});

		it('still deletes confirmed offenders when another workflow cannot be scanned', async () => {
			givenActiveWorkflows({
				'wf-broken': [node('node-1', 'unrecognized')],
				'wf-dup': [
					node('dup-id', 'poll', { name: 'Poll A' }),
					node('dup-id', 'poll', { name: 'Poll B' }),
				],
			});
			const service = buildService();

			await service.init();

			expect(service.allowed).toBe(false);
			expect(pollerStateRepository.deleteWorkflowCursors).toHaveBeenCalledWith(['wf-dup']);
		});

		it('reports the refusal to telemetry with the offending workflow ids and deleted row count', async () => {
			givenActiveWorkflows({
				'wf-dup': [
					node('dup-id', 'poll', { name: 'Poll A' }),
					node('dup-id', 'poll', { name: 'Poll B' }),
				],
			});
			pollerStateRepository.deleteWorkflowCursors.mockResolvedValue(1);
			const service = buildService();

			await service.init();

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE.INSTANCE_REFUSED_DURABLE_POLLERS,
				{ workflow_ids: ['wf-dup'], deleted_cursor_rows: 1 },
			);
		});
	});
});
