import type { GlobalConfig } from '@n8n/config';
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

	function makeTask(diagnosticsEnabled: boolean) {
		const globalConfig = mock<GlobalConfig>({ diagnostics: { enabled: diagnosticsEnabled } });
		const snapshotService = mock<AgentKnowledgeSnapshotService>();
		const telemetry = mock<Telemetry>();
		snapshotService.collect.mockResolvedValue(snapshot);

		return {
			task: new AgentKnowledgeSnapshotTask(globalConfig, snapshotService, telemetry),
			snapshotService,
			telemetry,
		};
	}

	it('runs every six hours on one main instance, without retries', () => {
		const SIX_HOURS_SECONDS = 6 * 60 * 60;
		const ONE_HOUR_SECONDS = 60 * 60;

		const { task } = makeTask(true);

		expect(task.name).toBe('agent-knowledge-snapshot');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: SIX_HOURS_SECONDS });
		expect(task.target).toEqual(
			expect.objectContaining({
				scope: 'cluster',
				scheduler: { retryOnFailure: false, missedAfterSeconds: ONE_HOUR_SECONDS, catchUp: true },
			}),
		);
	});

	it('sends the snapshot when diagnostics are enabled', async () => {
		const { task, telemetry } = makeTask(true);

		await task.run();

		expect(telemetry.track).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.AGENT_KNOWLEDGE_SNAPSHOT,
			snapshot,
		);
	});

	it('does not read the database when diagnostics are disabled', async () => {
		const { task, snapshotService, telemetry } = makeTask(false);

		await task.run();

		expect(snapshotService.collect).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
