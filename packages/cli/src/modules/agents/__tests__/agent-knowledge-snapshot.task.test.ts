import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import type {
	AgentKnowledgeSnapshot,
	AgentKnowledgeSnapshotService,
} from '../agent-knowledge-snapshot.service';
import { AgentKnowledgeSnapshotTask } from '../agent-knowledge-snapshot.task';

describe('AgentKnowledgeSnapshotTask', () => {
	const snapshot: AgentKnowledgeSnapshot = {
		published_agent_count: 4,
		published_with_files_count: 2,
		published_with_vector_stores_count: 2,
		published_with_both_count: 1,
		knowledge_file_count: 3,
		knowledge_total_bytes: 350,
		vector_store_count: 3,
		vector_store_providers: { pinecone: 2, qdrant: 1 },
	};

	function makeTask() {
		const snapshotService = mock<AgentKnowledgeSnapshotService>();
		const telemetry = mock<Telemetry>();
		snapshotService.collect.mockResolvedValue(snapshot);

		return {
			task: new AgentKnowledgeSnapshotTask(snapshotService, telemetry),
			snapshotService,
			telemetry,
		};
	}

	it('runs once a day on one main instance, without retries', () => {
		const ONE_DAY_SECONDS = 24 * 60 * 60;
		const ONE_HOUR_SECONDS = 60 * 60;

		const { task } = makeTask();

		expect(task.name).toBe('agent-knowledge-snapshot');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: ONE_DAY_SECONDS });
		expect(task.target).toEqual(
			expect.objectContaining({
				scope: 'cluster',
				scheduler: { retryOnFailure: false, missedAfterSeconds: ONE_HOUR_SECONDS, catchUp: true },
			}),
		);
	});

	it('sends the snapshot', async () => {
		const { task, snapshotService, telemetry } = makeTask();
		const { signal } = new AbortController();

		await task.run(signal);

		expect(snapshotService.collect).toHaveBeenCalledWith(signal);
		expect(telemetry.track).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.AGENT_KNOWLEDGE_SNAPSHOT,
			snapshot,
		);
	});

	it('does not send partial counts when the run aborts during the collection', async () => {
		const { task, snapshotService, telemetry } = makeTask();
		const abortController = new AbortController();
		snapshotService.collect.mockImplementation(async () => {
			abortController.abort();
			return snapshot;
		});

		await task.run(abortController.signal);

		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('sends nothing when the instance has no published agents', async () => {
		const { task, snapshotService, telemetry } = makeTask();
		snapshotService.collect.mockResolvedValue({
			...snapshot,
			published_agent_count: 0,
			published_with_files_count: 0,
			published_with_vector_stores_count: 0,
			published_with_both_count: 0,
			knowledge_file_count: 0,
			knowledge_total_bytes: 0,
			vector_store_count: 0,
			vector_store_providers: {},
		});

		await task.run(new AbortController().signal);

		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
