import type { SerializableAgentState } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Container } from '@n8n/di';
import { IsNull, Not } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AgentCheckpointPruningTask } from '@/modules/agents/agent-checkpoint-pruning.task';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

const suspendedState: SerializableAgentState = {
	status: 'suspended',
	persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
	messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
	pendingToolCalls: {},
};
const suspendedJson = JSON.stringify(suspendedState);

describe('AgentCheckpointPruningTask', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	let agentRepository: AgentRepository;
	let checkpointRepository: AgentCheckpointRepository;
	let storage: N8NCheckpointStorage;
	let task: AgentCheckpointPruningTask;
	let agentId: string;
	let stale: Date;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepository = Container.get(AgentRepository);
		checkpointRepository = Container.get(AgentCheckpointRepository);
		const config = Container.get(AgentsConfig);
		storage = new N8NCheckpointStorage(checkpointRepository, logger, config);
		task = new AgentCheckpointPruningTask(storage);
		stale = new Date(Date.now() - (config.checkpointTtlSeconds + Time.hours.toSeconds) * 1000);
	});

	beforeEach(async () => {
		logger.info.mockClear();
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			schema: { name: 'Test Agent', model: 'm', instructions: 'i' },
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'version-1',
			activeVersionId: null,
		} as Partial<Agent>);
		agentId = (await agentRepository.save(agent)).id;
	});

	afterEach(async () => {
		await checkpointRepository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertCheckpoints(
		prefix: string,
		count: number,
		updatedAt: Date,
	): Promise<string[]> {
		const runIds = Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
		for (let start = 0; start < runIds.length; start += 500) {
			await checkpointRepository.insert(
				runIds.slice(start, start + 500).map((runId) => ({
					runId,
					agentId,
					state: suspendedJson,
					expired: false,
					createdAt: updatedAt,
					updatedAt,
				})),
			);
		}
		return runIds;
	}

	async function counts(): Promise<{ expired: number; open: number }> {
		return {
			expired: await checkpointRepository.count({ where: { expired: true, state: IsNull() } }),
			open: await checkpointRepository.count({ where: { expired: false, state: Not(IsNull()) } }),
		};
	}

	function expiredTotal(): number {
		return logger.info.mock.calls
			.filter(([message]) => message === 'Marked stale agent checkpoints as expired')
			.reduce((sum, [, meta]) => sum + (meta as { count: number }).count, 0);
	}

	it('should expire each stale checkpoint once when runs overlap', async () => {
		await insertCheckpoints('stale', 3000, stale);
		await insertCheckpoints('fresh', 200, new Date());

		await Promise.all(Array.from({ length: 4 }, async () => await task.run()));

		expect(await counts()).toEqual({ expired: 3000, open: 200 });
		expect(expiredTotal()).toBe(3000);
	});

	it('should let a resume and a prune on the same checkpoint settle to one winner', async () => {
		const staleRunIds = await insertCheckpoints('stale', 500, stale);
		const freshRunIds = await insertCheckpoints('fresh', 100, new Date());
		// Timestamp columns hold whole seconds.
		const before = Math.floor(Date.now() / 1000) * 1000;

		const claim = async (runId: string) =>
			[runId, await storage.claimForResume(runId, suspendedState, agentId)] as const;
		const half = staleRunIds.length / 2;
		const earlyClaims = Promise.all(staleRunIds.slice(0, half).map(claim));
		const runs = Promise.all(Array.from({ length: 4 }, async () => await task.run()));
		const lateClaims = Promise.all([...staleRunIds.slice(half), ...freshRunIds].map(claim));
		await runs;
		const claimed = new Map([...(await earlyClaims), ...(await lateClaims)]);

		const rows = await checkpointRepository.find();
		expect(rows).toHaveLength(600);
		const claimedStale = staleRunIds.filter((runId) => claimed.get(runId)).length;
		expect(claimedStale).toBeGreaterThan(0);
		expect(claimedStale).toBeLessThan(staleRunIds.length);
		for (const row of rows) {
			expect(claimed.get(row.runId)).toBe(!row.expired);
			if (row.expired) {
				expect(row.state).toBeNull();
			} else {
				expect(JSON.parse(row.state!)).toMatchObject({ status: 'running' });
				expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
			}
		}
		for (const runId of freshRunIds) {
			expect(claimed.get(runId)).toBe(true);
		}
	});
});
