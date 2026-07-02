/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs and unbound-method references are acceptable test idioms */
import type { Mocked } from 'vitest';
import { mockLogger } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { Agent } from '../entities/agent.entity';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
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
		activeVersionId: null,
		activeVersion: null,
		tools: {},
		skills: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as Agent;
}

describe('AgentSkillsService', () => {
	let service: AgentSkillsService;
	let agentRepository: Mocked<AgentRepository>;
	let runtimeCacheService: Mocked<AgentRuntimeCacheService>;

	const skill = {
		name: 'Summarize Notes',
		description: 'Summarizes a meeting transcript',
		instructions: 'Extract decisions and action items.',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();

		agentRepository = mock<AgentRepository>();
		runtimeCacheService = mock<AgentRuntimeCacheService>();
		Container.set(AgentRuntimeCacheService, runtimeCacheService);
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
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});

	it('stores references without derived metadata when creating a skill', async () => {
		const agent = makeAgent({
			schema: {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.createSkill(agentId, projectId, {
			...skill,
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
				},
			],
		});

		expect(result.skill.references).toEqual([
			{
				path: 'references/guide.md',
				content: '# Guide',
			},
		]);
		expect(agentRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				skills: {
					[result.id]: expect.objectContaining({ references: result.skill.references }),
				},
			}),
		);
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
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});

	it('loads one skill from the agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ skills: { summarize_notes: skill } }),
		);

		await expect(service.getSkill(agentId, projectId, 'summarize_notes')).resolves.toEqual(skill);
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('updates an existing skill on the agent and preserves omitted references', async () => {
		const skillWithReferences = {
			...skill,
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
				},
			],
		};
		const agent = makeAgent({
			skills: {
				summarize_notes: skillWithReferences,
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.updateSkill(agentId, projectId, 'summarize_notes', {
			description: 'Summarizes support notes',
		});

		expect(result).toEqual({
			id: 'summarize_notes',
			skill: {
				...skill,
				description: 'Summarizes support notes',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
				],
			},
			versionId: agent.versionId,
		});
		expect(agentRepository.save.mock.calls[0][0].skills).toEqual({
			summarize_notes: result.skill,
		});
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});

	it('clears references when an update provides an empty reference list', async () => {
		const agent = makeAgent({
			skills: {
				summarize_notes: {
					...skill,
					references: [
						{
							path: 'references/guide.md',
							content: '# Guide',
						},
					],
				},
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.updateSkill(agentId, projectId, 'summarize_notes', {
			references: [],
		});

		expect(result.skill.references).toEqual([]);
		expect(agentRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				skills: {
					summarize_notes: expect.objectContaining({ references: [] }),
				},
			}),
		);
	});

	it('rejects creating a skill with a duplicate name', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				skills: { summarize_notes: skill },
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
				},
			}),
		);

		await expect(service.createAndAttachSkill(agentId, projectId, skill)).rejects.toThrow(
			'Agent already has a skill named "Summarize Notes".',
		);
	});

	it('rejects renaming a skill to another existing skill name', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				skills: {
					summarize_notes: skill,
					other_skill: { name: 'Other Skill', description: 'desc', instructions: 'Use it' },
				},
			}),
		);

		await expect(
			service.updateSkill(agentId, projectId, 'summarize_notes', { name: 'Other Skill' }),
		).rejects.toThrow('Agent already has a skill named "Other Skill".');
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
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});
});
