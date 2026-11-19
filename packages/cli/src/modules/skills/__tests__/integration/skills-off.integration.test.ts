import { ModuleRegistry } from '@n8n/backend-common';
import { createTeamProject, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

import { SkillUsageProxy } from '../../services/skill-usage-proxy.service';
import { createSkill, deleteAllSkills, FakeSkillUsage, findSkill } from '../../testing';

// Only the skills module loads, so the agents module never registers its `SkillUsage`:
// the real gates and proxy are off, with nothing stubbed.
beforeAll(async () => {
	await testModules.loadModules(['skills']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });

describe('Skills without the agents module', () => {
	it('leaves the proxy unregistered', () => {
		expect(Container.get(SkillUsageProxy).isRegistered).toBe(false);
	});

	it('hides the skills API, also before it reads the request', async () => {
		const owner = server.authAgentFor(await createOwner());

		await owner.get('/skills').expect(404);
		await owner
			.post('/skills')
			.send({ scope: 'instance', skill: { name: 'n' } })
			.expect(404);
		await owner.post('/skills').send({ scope: 'nope' }).expect(404);
		await owner.get('/skills?take=-1').expect(404);
	});
});

describe('Skills with the agents module, by consumer', () => {
	const usage = new FakeSkillUsage();
	const settings = Container.get(ModuleRegistry).settings;
	let owner: SuperAgentTest;

	const setConsumers = ({ agents = false, assistant = false, mcp = false }) => {
		settings.set('agents', { enabled: agents });
		settings.set('instance-ai', { enabled: assistant });
		settings.set('mcp', { mcpAccessEnabled: mcp });
	};

	beforeAll(async () => {
		Container.get(SkillUsageProxy).register(usage);
		owner = server.authAgentFor(await createOwner());
	});

	afterEach(async () => {
		await deleteAllSkills();
	});

	afterAll(() => {
		for (const moduleName of ['agents', 'instance-ai', 'mcp']) settings.delete(moduleName);
	});

	it('hides the skills API while agents, n8n Assistant and MCP access are all off', async () => {
		setConsumers({});
		const { id } = await createSkill();

		await owner.get('/skills').expect(404);
		await owner.get(`/skills/${id}`).expect(404);
		await owner.delete(`/skills/${id}`).expect(404);

		expect(await findSkill(id)).not.toBeNull();
	});

	it('shows the skills API while one consumer is on', async () => {
		setConsumers({ assistant: true });

		await owner.get('/skills').expect(200);
	});

	it('refuses to delete or move a skill that an agent uses while agents are off', async () => {
		setConsumers({ mcp: true });
		const project = await createTeamProject('Support team');
		const other = await createTeamProject('Other team');
		const { id } = await createSkill({ projectId: project.id });
		await usage.seed({
			agents: [{ key: 'agent-1', name: 'Support bot', project: project.id }],
			skills: [{ key: id, versions: ['Brand voice'] }],
			drafts: [{ agent: 'agent-1', skill: id }],
		});
		const {
			body: { data: skill },
		} = await owner.get(`/skills/${id}`).expect(200);

		await owner.delete(`/skills/${id}`).expect(409);
		await owner
			.patch(`/skills/${id}`)
			.send({ scope: 'project', projectId: other.id, baseSkillHash: skill.skillHash })
			.expect(409);

		expect(await findSkill(id)).toMatchObject({ projectId: project.id });
	});
});
