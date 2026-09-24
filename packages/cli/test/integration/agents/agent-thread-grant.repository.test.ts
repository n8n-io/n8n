import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { DbConnection, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { AgentToolApprovalService } from '@/modules/agents/agent-tool-approval.service';
import { buildAgentConfigurationTelemetryFromConfig } from '@/modules/agents/agent-telemetry';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentThreadGrantRepository } from '@/modules/agents/repositories/agent-thread-grant.repository';
import type { Telemetry } from '@/telemetry';

const telemetry = mock<Telemetry>();
const configuration = buildAgentConfigurationTelemetryFromConfig(null);

describe('Agent thread grants', () => {
	let source: DataSource;
	let peer: DataSource;
	let grants: AgentThreadGrantRepository;
	let peerGrants: AgentThreadGrantRepository;
	let threads: AgentExecutionThreadRepository;
	let agents: AgentRepository;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		source = Container.get(DataSource);
		grants = Container.get(AgentThreadGrantRepository);
		threads = Container.get(AgentExecutionThreadRepository);
		agents = Container.get(AgentRepository);
		peer = await new DataSource({
			...source.options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
		}).initialize();
		peerGrants = new AgentThreadGrantRepository(peer, Container.get(TransactionRunner));
	}, 60_000);

	afterAll(async () => {
		if (peer?.isInitialized) await peer.destroy();
		await testDb.terminate();
	});

	it('persists shared allowances, isolates threads, and cascades deletion across connections', async () => {
		const project = await createTeamProject();
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
		for (const id of ['parent', 'child', 'sibling', 'new-thread']) {
			await threads.save(
				threads.create({
					id,
					agentId: agent.id,
					agentName: agent.name,
					projectId: project.id,
					accessScope: 'project',
					ownerId: null,
					parentThreadId: id === 'child' || id === 'sibling' ? 'parent' : null,
				}),
			);
		}
		const params = {
			threadId: 'child',
			agentId: agent.id,
			telemetry: { userId: 'first-participant', runType: 'test' as const, configuration },
		};
		const service = new AgentToolApprovalService(grants, telemetry);
		const peerService = new AgentToolApprovalService(peerGrants, telemetry);
		const context = await service.createContext(params);
		const peerContext = await peerService.createContext(params);
		const key = '["tool","notion_search"]';
		await Promise.all([
			context.onDecision(key, { approved: true, scope: 'session' }),
			peerContext.onDecision(key, { approved: true, scope: 'session' }),
		]);
		expect(await grants.countBy({ threadId: 'child' })).toBe(1);

		const reloaded = await peerService.createContext({
			...params,
			telemetry: { ...params.telemetry, userId: 'second-participant' },
		});
		expect([...reloaded.approvedKeys]).toEqual([key]);
		for (const threadId of ['parent', 'sibling', 'new-thread']) {
			const isolated = await service.createContext({ ...params, threadId });
			expect(isolated.approvedKeys.size).toBe(0);
		}
		await threads.delete('child');
		expect(await peerGrants.findKeys('child')).toEqual(new Set());

		// Exercise down and up with existing conversations on both database engines.
		await peer.destroy();
		// Template databases skip the migration wrapper setup.
		await Container.get(DbConnection).migrate();
		await source.undoLastMigration();
		const runner = source.createQueryRunner();
		try {
			expect(await runner.hasTable(grants.metadata.tablePath)).toBe(false);
		} finally {
			await runner.release();
		}
		expect(await threads.existsBy({ id: 'parent' })).toBe(true);
		await Container.get(DbConnection).migrate();
		expect(await grants.findKeys('parent')).toEqual(new Set());
	});
});
