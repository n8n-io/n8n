import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { Publisher, Subscriber } from '@n8n/backend-services';

import type { AgentClusterService } from '../../agent-cluster.service';
import { AgentQueuedTestStreamService } from '../../agent-queued-test-stream.service';
import { AgentRemoteTurnService } from '../../queue/agent-remote-turn.service';
import type { AgentStreamChannel } from '../../queue/agent-stream-channel.service';
import { AgentTurnDispatcher } from '../../queue/agent-turn-dispatcher.service';
import type { AgentTurnGate } from '../../queue/agent-turn-gate.service';
import { AgentTurnHandlers } from '../../queue/agent-turn-handlers.service';
import type { AgentTurnPlacement } from '../../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../../queue/agent-turn-queue.service';
import { InProcessTurnRunner } from '../../queue/in-process-turn-runner';
import type { AgentMessageQueueRepository } from '../../repositories/agent-message-queue.repository';
import type { AgentTurnRequestRepository } from '../../repositories/agent-turn-request.repository';
import { testCluster } from './cluster';

export interface TestTurnsOptions {
	cluster?: AgentClusterService;
	/** Defaults to a placement with no agent worker. */
	placement?: AgentTurnPlacement;
	/** Defaults to a gate that admits every turn. */
	gate?: AgentTurnGate;
	agentsConfig?: AgentsConfig;
	turnQueue?: AgentTurnQueue;
	requests?: AgentTurnRequestRepository;
	streams?: AgentQueuedTestStreamService;
}

/**
 * The real handler registry, runners and dispatcher over mocked storage, so
 * that a test of a service that runs agent turns runs them for real.
 */
export function testTurns(options: TestTurnsOptions = {}) {
	const cluster = options.cluster ?? testCluster({ instanceKey: 'instance-a' });
	const placement =
		options.placement ??
		mock<AgentTurnPlacement>({
			dispatchEnabled: false,
			workersAvailable: async () => false,
			retryAfterSeconds: async () => 15,
		});
	const gate =
		options.gate ?? mock<AgentTurnGate>({ waitForRoom: async () => ({ admitted: true }) });
	const streams =
		options.streams ??
		new AgentQueuedTestStreamService(
			mock<Publisher>(),
			testCluster(),
			mock<AgentMessageQueueRepository>(),
			mockLogger(),
			mock<Subscriber>(),
			mock<AgentStreamChannel>({ enabled: false }),
		);
	const handlers = new AgentTurnHandlers(mockLogger());
	const inProcess = new InProcessTurnRunner(cluster, gate, handlers);
	const remote = new AgentRemoteTurnService(
		mockLogger(),
		options.agentsConfig ?? mock<AgentsConfig>({ queueMaxWaitSeconds: 0 }),
		cluster,
		placement,
		gate,
		options.turnQueue ?? mock<AgentTurnQueue>(),
		options.requests ?? mock<AgentTurnRequestRepository>(),
		streams,
		handlers,
	);
	const dispatcher = new AgentTurnDispatcher(mockLogger(), placement, inProcess, remote);
	return { handlers, inProcess, remote, dispatcher, streams };
}
