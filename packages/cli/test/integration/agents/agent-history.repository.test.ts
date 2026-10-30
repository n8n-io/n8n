import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createUser } from '../shared/db/users';

describe('AgentHistoryRepository', () => {
	let history: AgentHistoryRepository;
	let agents: AgentRepository;
	let saver: User;
	let publisher: User;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['skills', 'agents']);
		await testDb.init();
		history = Container.get(AgentHistoryRepository);
		agents = Container.get(AgentRepository);
		saver = await createUser({ firstName: 'Draft', lastName: 'Author' });
		publisher = await createUser({ firstName: 'Release', lastName: 'Publisher' });
		const project = await createTeamProject();
		const agent = await agents.save(
			agents.create({ name: 'Support', projectId: project.id, integrations: [], tools: {} }),
		);
		agentId = agent.id;
	});

	afterAll(async () => await testDb.terminate());

	it('records the saver without a publishing identity', async () => {
		const versionId = randomUUID();
		await history.saveVersion({ agentId, versionId, schema: null, tools: {}, savedBy: saver }, {});

		expect(await history.findByVersionAndAgentId(versionId, agentId, {})).toMatchObject({
			author: 'Draft Author',
			publishedById: null,
		});
	});

	it('keeps legacy publication attribution when no saver is supplied', async () => {
		const versionId = randomUUID();
		await history.saveVersion(
			{ agentId, versionId, schema: null, tools: {}, publishedBy: publisher },
			{},
		);

		expect(await history.findByVersionAndAgentId(versionId, agentId, {})).toMatchObject({
			author: 'Release Publisher',
			publishedById: publisher.id,
		});
	});

	it('keeps the saver separate from a different publisher', async () => {
		const versionId = randomUUID();
		await history.saveVersion(
			{ agentId, versionId, schema: null, tools: {}, savedBy: saver, publishedBy: publisher },
			{},
		);

		expect(await history.findByVersionAndAgentId(versionId, agentId, {})).toMatchObject({
			author: 'Draft Author',
			publishedById: publisher.id,
		});
	});
});
