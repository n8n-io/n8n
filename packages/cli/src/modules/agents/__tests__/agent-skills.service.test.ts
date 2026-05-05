/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs and unbound-method references are acceptable test idioms */
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import type { Agent } from '../entities/agent.entity';
import { AgentSkillsService } from '../agent-skills.service';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
const versionId = 'v1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		versionId,
		schema: null,
		publishedVersion: null,
		tools: {},
		skills: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as Agent;
}

describe('AgentSkillsService', () => {
	let service: AgentSkillsService;
	let agentRepository: jest.Mocked<AgentRepository>;

	const skill = {
		name: 'Summarize Notes',
		description: 'Summarizes a meeting transcript',
		instructions: 'Extract decisions and action items.',
	};

	beforeEach(() => {
		jest.clearAllMocks();

		agentRepository = mock<AgentRepository>();
		agentRepository.save.mockImplementation(async (a) => a as Agent);
		service = new AgentSkillsService(mockLogger(), agentRepository);
	});

	it('creates a skill without attaching it to the config', async () => {
		const agent = makeAgent({
			schema: {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.createSkill(agentId, projectId, skill);

		expect(result).toEqual({
			id: expect.stringMatching(/^skill_[A-Za-z0-9]{16}$/),
			skill,
			versionId: agent.versionId,
		});
		expect(agentRepository.save.mock.calls[0][0].skills).toEqual({
			[result.id]: skill,
		});
		expect(agent.schema?.skills).toEqual([]);
	});

	it('creates and attaches a skill on the agent when requested', async () => {
		const agent = makeAgent({
			schema: {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.createAndAttachSkill(agentId, projectId, skill);

		expect(agentRepository.save.mock.calls[0][0].skills).toEqual({
			[result.id]: skill,
		});
		expect(agent.schema?.skills).toEqual([{ type: 'skill', id: result.id }]);
	});

	it('loads one skill from the agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ skills: { summarize_notes: skill } }),
		);

		await expect(service.getSkill(agentId, projectId, 'summarize_notes')).resolves.toEqual(skill);
	});

	it('updates an existing skill on the agent', async () => {
		const agent = makeAgent({ skills: { summarize_notes: skill } });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.updateSkill(agentId, projectId, 'summarize_notes', {
			description: 'Summarizes support notes',
		});

		expect(result).toEqual({
			id: 'summarize_notes',
			skill: {
				...skill,
				description: 'Summarizes support notes',
			},
			versionId: agent.versionId,
		});
		expect(agentRepository.save.mock.calls[0][0].skills).toEqual({
			summarize_notes: result.skill,
		});
	});

	it('deletes a skill and removes its config ref', async () => {
		const agent = makeAgent({
			skills: { summarize_notes: skill },
			schema: {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				tools: [{ type: 'custom', id: 'custom_tool' }],
				skills: [{ type: 'skill', id: 'summarize_notes' }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.deleteSkill(agentId, projectId, 'summarize_notes');

		expect(agentRepository.save.mock.calls[0][0].skills).toEqual({});
		expect(agent.schema?.tools).toEqual([{ type: 'custom', id: 'custom_tool' }]);
		expect(agent.schema?.skills).toEqual([]);
	});
});
