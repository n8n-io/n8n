import type { StoredAgentConfig } from '@n8n/api-types';
import type { OperationContext, TransactionRunner, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentDefinitionService } from '../agent-definition.service';
import type { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTask } from '../entities/agent-task.entity';
import { Agent } from '../entities/agent.entity';
import type { AgentHistoryRepository } from '../repositories/agent-history.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentRepository } from '../repositories/agent.repository';

describe('Agent definition snapshots', () => {
	const tasks = mock<AgentTaskRepository>();
	const history = mock<AgentHistoryRepository>();
	const snapshots = mock<AgentTaskSnapshotRepository>();
	const agents = mock<AgentRepository>();
	const skills = mock<AgentSkillRefsService>();
	const service = new AgentDefinitionService(
		tasks,
		history,
		snapshots,
		agents,
		mock<TransactionRunner>(),
		skills,
	);
	const ctx: OperationContext = {};

	beforeEach(() => vi.resetAllMocks());

	it('captures all task bodies and keeps save attribution separate from publication', async () => {
		const schema: StoredAgentConfig = {
			name: 'Draft',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Help',
			tasks: [
				{ type: 'task', id: 'enabled', enabled: true },
				{ type: 'task', id: 'disabled', enabled: false },
			],
		};
		const agent = Object.assign(new Agent(), {
			id: 'agent',
			versionId: 'version',
			schema,
			tools: {},
			integrations: [],
		});
		const user = { id: 'saver' } as User;
		const version = { versionId: 'version' } as AgentHistory;
		history.findByVersionAndAgentId.mockResolvedValue(null);
		history.saveVersion.mockResolvedValue(version);
		const pins = new Map([['skill', 'skill-version']]);
		skills.versionSnapshot.mockResolvedValue(pins);
		tasks.findByAgentId.mockResolvedValue([
			mock<AgentTask>({
				id: 'enabled',
				name: 'Daily summary',
				objective: 'Summarize new requests',
				cronExpression: '0 9 * * *',
				timezone: 'Europe/Berlin',
			}),
			mock<AgentTask>({
				id: 'disabled',
				name: 'Weekly report',
				objective: 'Review unresolved requests',
				cronExpression: '0 12 * * 1',
				timezone: null,
			}),
		]);

		expect(await service.captureVersion(agent, user, ctx)).toBe(version);
		expect(history.saveVersion).toHaveBeenCalledWith(
			expect.objectContaining({ savedBy: user, versionId: 'version', tools: {} }),
			ctx,
		);
		expect(history.saveVersion.mock.calls[0][0]).not.toHaveProperty('publishedBy');
		expect(history.saveVersion.mock.calls[0][0]).not.toHaveProperty('skills');
		expect(skills.pinVersion).toHaveBeenCalledWith('version', pins, ctx);
		expect(snapshots.saveForVersion).toHaveBeenCalledWith(
			[
				{
					versionId: 'version',
					taskId: 'enabled',
					enabled: true,
					name: 'Daily summary',
					objective: 'Summarize new requests',
					cronExpression: '0 9 * * *',
					timezone: 'Europe/Berlin',
				},
				{
					versionId: 'version',
					taskId: 'disabled',
					enabled: false,
					name: 'Weekly report',
					objective: 'Review unresolved requests',
					cronExpression: '0 12 * * 1',
					timezone: null,
				},
			],
			ctx,
		);
		expect(tasks.findByAgentId).toHaveBeenCalledWith('agent', ctx);
	});

	it('leaves an existing immutable version unchanged', async () => {
		const version = mock<AgentHistory>();
		history.findByVersionAndAgentId.mockResolvedValue(version);
		expect(
			await service.captureVersion(mock<Agent>({ versionId: 'version' }), 'Unknown', ctx),
		).toBe(version);
		expect(history.saveVersion).not.toHaveBeenCalled();
		expect(skills.versionSnapshot).not.toHaveBeenCalled();
	});
});
