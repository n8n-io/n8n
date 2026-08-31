import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowTriggerSeatRepository } from '@n8n/db';
import { MANUAL_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ScheduleTriggerJobRegistrar } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';

import { TriggerSeatProjector } from '../trigger-seat-projector';
import { createNodeTypes, logger, node } from '../../__tests__/trigger-test-utils';

vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn(),
}));

function buildProjector(overrides: {
	seatRepository?: WorkflowTriggerSeatRepository;
	workflowsConfig?: Partial<WorkflowsConfig>;
	scheduleRegistrar?: ScheduleTriggerJobRegistrar;
}) {
	const workflowsConfig = mock<WorkflowsConfig>({
		useWorkflowPublicationService: true,
		useTriggerSeats: true,
		triggerSeatTeardownWaitSeconds: 1,
		...overrides.workflowsConfig,
	});
	const scheduleRegistrar =
		overrides.scheduleRegistrar ??
		mock<ScheduleTriggerJobRegistrar>({ interceptsNode: () => false } as never);
	return new TriggerSeatProjector(
		logger,
		workflowsConfig,
		overrides.seatRepository ?? mock<WorkflowTriggerSeatRepository>(),
		scheduleRegistrar,
		createNodeTypes() as never,
	);
}

describe('TriggerSeatProjector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('refuses seats without the publication service', () => {
			expect(() =>
				buildProjector({
					workflowsConfig: { useWorkflowPublicationService: false, useTriggerSeats: true },
				}),
			).toThrow('N8N_USE_TRIGGER_SEATS requires N8N_USE_WORKFLOW_PUBLICATION_SERVICE');
		});
	});

	describe('getSeatEligibleNodes', () => {
		it('keeps trigger() nodes, drops pseudo and schedule-intercepted ones', () => {
			const scheduleRegistrar = mock<ScheduleTriggerJobRegistrar>();
			scheduleRegistrar.interceptsNode.mockImplementation(
				(candidate) => candidate.id === 'schedule-node',
			);
			const projector = buildProjector({ scheduleRegistrar });

			const eligible = projector.getSeatEligibleNodes([
				node('kafka-node', 'trigger'),
				node('schedule-node', 'trigger'),
				node('manual-node', MANUAL_TRIGGER_NODE_TYPE),
			]);

			expect(eligible.map((eligibleNode) => eligibleNode.id)).toEqual(['kafka-node']);
		});
	});

	describe('projectSeats', () => {
		it('upserts seats per node with a clamped seatCount parameter', async () => {
			const seatRepository = mock<WorkflowTriggerSeatRepository>();
			const projector = buildProjector({ seatRepository });

			await projector.projectSeats('wf-1', 'v2', [
				node('kafka-node', 'trigger', { parameters: { seatCount: 3 } }),
				node('singleton-node', 'trigger'),
				node('greedy-node', 'trigger', { parameters: { seatCount: 9999 } }),
			]);

			expect(seatRepository.upsertDesiredSeats).toHaveBeenCalledWith('wf-1', 'kafka-node', 3, 'v2');
			expect(seatRepository.upsertDesiredSeats).toHaveBeenCalledWith(
				'wf-1',
				'singleton-node',
				1,
				'v2',
			);
			expect(seatRepository.upsertDesiredSeats).toHaveBeenCalledWith(
				'wf-1',
				'greedy-node',
				16,
				'v2',
			);
		});
	});

	describe('retireSeatsAndAwait', () => {
		it('marks inactive and returns once holders ack teardown', async () => {
			const seatRepository = mock<WorkflowTriggerSeatRepository>();
			seatRepository.countRegisteredSeats.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
			const projector = buildProjector({ seatRepository });

			await projector.retireSeatsAndAwait('wf-1', ['kafka-node']);

			expect(seatRepository.markSeatsInactive).toHaveBeenCalledWith('wf-1', ['kafka-node']);
			expect(seatRepository.countRegisteredSeats).toHaveBeenCalledTimes(2);
		});

		it('gives up at the timeout and proceeds', async () => {
			const seatRepository = mock<WorkflowTriggerSeatRepository>();
			seatRepository.countRegisteredSeats.mockResolvedValue(1);
			const projector = buildProjector({ seatRepository });

			await projector.retireSeatsAndAwait('wf-1', ['kafka-node']);

			expect(seatRepository.markSeatsInactive).toHaveBeenCalled();
		});

		it('does nothing for an empty node set', async () => {
			const seatRepository = mock<WorkflowTriggerSeatRepository>();
			const projector = buildProjector({ seatRepository });

			await projector.retireSeatsAndAwait('wf-1', []);

			expect(seatRepository.markSeatsInactive).not.toHaveBeenCalled();
		});
	});
});
