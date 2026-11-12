import { CreatedAgentPublicDto } from '@n8n/api-types';
import { createTeamProject, linkUserToProject, mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import { AgentPolicyService } from '@/modules/agents/agent-policy.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentSetupCompletionService } from '@/modules/agents/agent-setup-completion.service';
import { registerSkillUsage } from '@/modules/agents/register-skill-usage';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { Telemetry } from '@/telemetry';

import { createMemberWithApiKey } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

mockInstance(Telemetry);
mockInstance(AgentUpdateBroadcaster);
mockInstance(AgentSetupCompletionService);
mockInstance(AgentDefaultModelResolverService).resolve.mockResolvedValue(null);

const server = setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['skills', 'agents'],
	enabledFeatures: ['feat:projectRole:admin', 'feat:projectRole:editor', 'feat:projectRole:viewer'],
	quotas: { 'quota:maxTeamProjects': 100 },
});
let user: User;
let personalProjectId: string;
const config = { name: 'Support', model: '', instructions: 'Help users.' };

beforeAll(() => registerSkillUsage());
beforeEach(async () => {
	user = await createMemberWithApiKey({ scopes: ['agent:create'] });
	personalProjectId = (
		await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id)
	).id;
});
afterEach(() => vi.restoreAllMocks());

describe('POST /agents', () => {
	it('creates in the personal project when projectId is omitted', async () => {
		const response = await server
			.publicApiAgentFor(user)
			.post('/agents')
			.send({ name: 'Support' })
			.expect(201);
		expect(CreatedAgentPublicDto.safeParse(response.body).success).toBe(true);
		expect(response.body).toMatchObject({
			name: 'Support',
			projectId: personalProjectId,
			availableInMCP: false,
		});
		expect(response.body).not.toHaveProperty('schema');
		expect(response.body).not.toHaveProperty('integrations');
		expect(response.body).not.toHaveProperty('skillHashes');
		expect(response.body).not.toHaveProperty('adopted');
		expect(await Container.get(AgentRepository).findById(response.body.id)).toMatchObject({
			projectId: personalProjectId,
		});
	});

	it('creates a configured agent and custom tools in a team project', async () => {
		const project = await createTeamProject('Team', user);
		const tools = { lookup: { code: 'return []', descriptor: { name: 'lookup' } } };
		const response = await server
			.publicApiAgentFor(user)
			.post('/agents')
			.send({
				name: 'Support',
				projectId: project.id,
				config: { ...config, tools: [{ type: 'custom', id: 'lookup' }] },
				tools,
				availableInMCP: true,
			})
			.expect(201);
		expect(response.body).toMatchObject({
			projectId: project.id,
			config,
			tools,
			availableInMCP: true,
		});
		expect(response.body.configHash).toMatch(/^[a-f0-9]{64}$/);
		expect(await Container.get(AgentRepository).findById(response.body.id)).toMatchObject({
			tools,
		});
	});

	it('keeps the requested name and clears an inaccessible credential', async () => {
		const response = await server
			.publicApiAgentFor(user)
			.post('/agents')
			.send({
				name: 'Support',
				config: {
					...config,
					name: 'Other name',
					model: 'openai/gpt-4.1-mini',
					credential: 'unavailable',
				},
			})
			.expect(201);
		expect(response.body).toMatchObject({
			name: 'Support',
			config: { name: 'Support', credential: '' },
		});
	});

	it('requires an API key', async () => {
		await server
			.publicApiAgentWithoutApiKey()
			.post('/agents')
			.send({ name: 'Support' })
			.expect(401);
	});

	it('requires the agent:create API key scope', async () => {
		const reader = await createMemberWithApiKey({ scopes: ['agent:read'] });
		await server.publicApiAgentFor(reader).post('/agents').send({ name: 'Support' }).expect(403);
	});

	it.each(['project:viewer', 'project:editor', undefined])(
		'checks target project permission for %s',
		async (role) => {
			const project = await createTeamProject();
			if (role) await linkUserToProject(user, project, role);
			const expectedStatus = role === 'project:editor' ? 201 : 403;
			await server
				.publicApiAgentFor(user)
				.post('/agents')
				.send({ name: 'Support', projectId: project.id })
				.expect(expectedStatus);
		},
	);

	it.each([
		{ name: '' },
		{ name: 'Support', config: { ...config, model: null } },
		{ name: 'Support', config: { ...config, instructions: 123 } },
		{ name: 'Support', config: { ...config, tools: [{ type: 'unknown' }] } },
		{ name: 'Support', adoptOnCollision: true },
		{ name: 'Support', schema: config },
		{ name: 'Support', skills: {} },
		{
			name: 'Support',
			tools: { lookup: { code: 'return []', descriptor: { name: 'invalid name' } } },
		},
	])('rejects invalid creation input: %j', async (body) => {
		await server.publicApiAgentFor(user).post('/agents').send(body).expect(400);
		expect(await Container.get(AgentRepository).findByProjectId(personalProjectId)).toHaveLength(0);
	});

	it('rejects a policy violation before saving', async () => {
		vi.spyOn(Container.get(AgentPolicyService), 'enforceSave').mockRejectedValueOnce(
			new PolicyViolationError([
				{
					kind: 'node-type-unavailable',
					checkId: 'node-type-availability',
					message: 'The configured tool is unavailable.',
					subject: 'tool',
					subjectType: 'node-type',
					scope: 'instance',
				},
			]),
		);
		await server
			.publicApiAgentFor(user)
			.post('/agents')
			.send({ name: 'Support', config })
			.expect(422);
		expect(await Container.get(AgentRepository).findByProjectId(personalProjectId)).toHaveLength(0);
	});

	it('returns the shared document shape from internal creation', async () => {
		const response = await server
			.authAgentFor(user)
			.post(`/projects/${personalProjectId}/agents/v2`)
			.send({ name: 'Support', config })
			.expect(200);
		expect(CreatedAgentPublicDto.parse(response.body.data)).toMatchObject({
			name: 'Support',
			projectId: personalProjectId,
			config,
		});
		expect(response.body.data.configHash).toMatch(/^[a-f0-9]{64}$/);
	});

	it('validates config on internal creation', async () => {
		await server
			.authAgentFor(user)
			.post(`/projects/${personalProjectId}/agents/v2`)
			.send({ name: 'Support', config: { ...config, model: null } })
			.expect(400);
	});
});
