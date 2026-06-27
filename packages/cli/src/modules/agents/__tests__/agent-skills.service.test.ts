/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs and unbound-method references are acceptable test idioms */
import { mockLogger } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { Agent } from '../entities/agent.entity';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentSkillsService } from '../agent-skills.service';
import type { AgentSkillDefinition } from '../entities/agent-skill.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSkillSnapshotRepository } from '../repositories/agent-skill-snapshot.repository';
import type { AgentSkillRepository } from '../repositories/agent-skill.repository';

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
	let agentRepository: jest.Mocked<AgentRepository>;
	let runtimeCacheService: jest.Mocked<AgentRuntimeCacheService>;
	let skillRepository: jest.Mocked<AgentSkillRepository>;
	let skillSnapshotRepository: jest.Mocked<AgentSkillSnapshotRepository>;
	let trx: { save: jest.Mock; remove: jest.Mock; getRepository: jest.Mock };

	const skill = {
		name: 'Summarize Notes',
		description: 'Summarizes a meeting transcript',
		instructions: 'Extract decisions and action items.',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		Container.reset();

		agentRepository = mock<AgentRepository>();
		runtimeCacheService = mock<AgentRuntimeCacheService>();
		Container.set(AgentRuntimeCacheService, runtimeCacheService);
		skillRepository = mock<AgentSkillRepository>();
		skillSnapshotRepository = mock<AgentSkillSnapshotRepository>();
		trx = {
			save: jest.fn(async (entity) => entity),
			remove: jest.fn(async (entity) => entity),
			getRepository: jest.fn(),
		};
		Object.defineProperty(agentRepository, 'manager', {
			value: { transaction: jest.fn(async (handler) => await handler(trx)) },
			configurable: true,
		});
		skillRepository.create.mockImplementation((definition) => definition as AgentSkillDefinition);
		service = new AgentSkillsService(
			mockLogger(),
			agentRepository,
			skillRepository,
			skillSnapshotRepository,
		);
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
		skillRepository.findByAgentId.mockResolvedValue([]);

		const result = await service.createSkill(agentId, projectId, skill);

		expect(result).toEqual({
			id: expect.stringMatching(/^skill_[A-Za-z0-9]{16}$/),
			skill,
			versionId: agent.versionId,
		});
		expect(trx.save).toHaveBeenCalledWith(expect.objectContaining({ id: result.id, agentId }));
		expect(trx.save).toHaveBeenCalledWith(
			expect.objectContaining({ id: result.id, linkedFiles: { references: [] } }),
		);
		expect(agent.schema?.skills).toEqual([]);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
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
		skillRepository.findByAgentId.mockResolvedValue([]);

		const result = await service.createAndAttachSkill(agentId, projectId, skill);

		expect(trx.save).toHaveBeenCalledWith(expect.objectContaining({ id: result.id, agentId }));
		expect(agent.schema?.skills).toEqual([{ type: 'skill', id: result.id }]);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});

	it('loads one skill from the agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		skillRepository.findByIdAndAgentId.mockResolvedValue(
			makeDefinition('summarize_notes', {
				linkedFiles: {
					references: [
						{
							path: 'references/guide.md',
							content: '# Guide',
							bytes: 0,
							sha256: '0'.repeat(64),
						},
					],
				},
			}),
		);

		await expect(service.getSkill(agentId, projectId, 'summarize_notes')).resolves.toEqual({
			...skill,
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
					bytes: 7,
					sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
				},
			],
		});
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('updates an existing skill and replaces references when provided', async () => {
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		skillRepository.findByIdAndAgentId.mockResolvedValue(makeDefinition('summarize_notes'));
		skillRepository.findByAgentId.mockResolvedValue([makeDefinition('summarize_notes')]);

		const result = await service.updateSkill(agentId, projectId, 'summarize_notes', {
			description: 'Summarizes support notes',
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
					bytes: 0,
					sha256: '0'.repeat(64),
				},
			],
		});

		expect(result).toEqual({
			id: 'summarize_notes',
			skill: expect.objectContaining({
				...skill,
				description: 'Summarizes support notes',
				references: [
					expect.objectContaining({
						path: 'references/guide.md',
						content: '# Guide',
						bytes: 7,
						sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
					}),
				],
			}),
			versionId: agent.versionId,
		});
		expect(trx.save).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'summarize_notes',
				linkedFiles: {
					references: [
						expect.objectContaining({
							path: 'references/guide.md',
							bytes: 7,
							sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
						}),
					],
				},
			}),
		);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});

	it('preserves existing references when updates omit references', async () => {
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		skillRepository.findByIdAndAgentId.mockResolvedValue(
			makeDefinition('summarize_notes', {
				linkedFiles: {
					references: [
						{
							path: 'references/guide.md',
							content: '# Guide',
							bytes: 7,
							sha256: '0'.repeat(64),
						},
					],
				},
			}),
		);
		skillRepository.findByAgentId.mockResolvedValue([
			makeDefinition('summarize_notes', {
				linkedFiles: {
					references: [
						{
							path: 'references/guide.md',
							content: '# Guide',
							bytes: 7,
							sha256: '0'.repeat(64),
						},
					],
				},
			}),
		]);

		await service.updateSkill(agentId, projectId, 'summarize_notes', {
			description: 'Summarizes support notes',
		});

		expect(trx.save).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'summarize_notes',
				linkedFiles: {
					references: [
						expect.objectContaining({
							path: 'references/guide.md',
							content: '# Guide',
							bytes: 7,
						}),
					],
				},
			}),
		);
	});

	it('rejects creating a skill with a duplicate name', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
					skills: [],
				},
			}),
		);
		skillRepository.findByAgentId.mockResolvedValue([
			makeDefinition('summarize_notes', { name: 'Summarize Notes' }),
		]);

		await expect(service.createAndAttachSkill(agentId, projectId, skill)).rejects.toThrow(
			'Agent already has a skill named "Summarize Notes".',
		);
	});

	it('rejects renaming a skill to another existing skill name', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		skillRepository.findByIdAndAgentId.mockResolvedValue(makeDefinition('summarize_notes'));
		skillRepository.findByAgentId.mockResolvedValue([
			makeDefinition('summarize_notes'),
			makeDefinition('other_skill', { name: 'Other Skill' }),
		]);

		await expect(
			service.updateSkill(agentId, projectId, 'summarize_notes', { name: 'Other Skill' }),
		).rejects.toThrow('Agent already has a skill named "Other Skill".');
	});

	it('rejects skill snapshots when configured skill bodies are missing', async () => {
		trx.getRepository.mockReturnValue({
			findBy: jest.fn(async () => []),
		});

		await expect(
			service.snapshotConfiguredSkills(trx as never, 'version-1', agentId, {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [{ type: 'skill', id: 'missing_skill' }],
			}),
		).rejects.toThrow('Cannot publish agent with missing skill bodies: missing_skill');
	});

	it('snapshots configured skills with linked files on the skill row', async () => {
		trx.getRepository.mockReturnValue({
			findBy: jest.fn(async () => [
				makeDefinition('summarize_notes', {
					linkedFiles: {
						references: [
							{
								path: 'references/guide.md',
								content: '# Guide',
								bytes: 7,
								sha256: 'a'.repeat(64),
							},
						],
					},
				}),
			]),
		});

		await service.snapshotConfiguredSkills(trx as never, 'version-1', agentId, {
			name: 'Test Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		});

		expect(skillSnapshotRepository.saveForVersion).toHaveBeenCalledWith(
			[
				expect.objectContaining({
					versionId: 'version-1',
					skillId: 'summarize_notes',
					linkedFiles: {
						references: [
							expect.objectContaining({
								path: 'references/guide.md',
								content: '# Guide',
							}),
						],
					},
				}),
			],
			trx,
		);
	});

	it('restores linked files from skill snapshots into draft definitions', async () => {
		const definitionRepo = {
			findBy: jest.fn(async () => []),
			delete: jest.fn(),
			save: jest.fn(),
		};
		trx.getRepository.mockReturnValue(definitionRepo);
		skillSnapshotRepository.findByVersionId.mockResolvedValue([
			{
				versionId: 'version-1',
				skillId: 'summarize_notes',
				name: skill.name,
				description: skill.description,
				instructions: skill.instructions,
				allowedTools: null,
				recommendedTools: null,
				interfaceData: null,
				policy: null,
				dependencies: null,
				versionName: null,
				license: null,
				compatibility: null,
				platforms: null,
				metadata: null,
				linkedFiles: {
					references: [
						{
							path: 'references/guide.md',
							content: '# Guide',
							bytes: 7,
							sha256: 'a'.repeat(64),
						},
					],
				},
			} as never,
		]);

		await service.restoreSkillsFromSnapshot(trx as never, agentId, 'version-1');

		expect(definitionRepo.save).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'summarize_notes',
				agentId,
				linkedFiles: {
					references: [
						expect.objectContaining({
							path: 'references/guide.md',
							content: '# Guide',
						}),
					],
				},
			}),
		);
	});

	it('deletes a skill and removes its config ref', async () => {
		const agent = makeAgent({
			schema: {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				tools: [{ type: 'custom', id: 'custom_tool' }],
				skills: [{ type: 'skill', id: 'summarize_notes' }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		skillRepository.findByIdAndAgentId.mockResolvedValue(makeDefinition('summarize_notes'));

		await service.deleteSkill(agentId, projectId, 'summarize_notes');

		expect(trx.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'summarize_notes' }));
		expect(agent.schema?.tools).toEqual([{ type: 'custom', id: 'custom_tool' }]);
		expect(agent.schema?.skills).toEqual([]);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});

	it('detects missing configured skills from definition rows', async () => {
		skillRepository.findByAgentId.mockResolvedValue([makeDefinition('present_skill')]);

		await expect(
			service.getMissingSkillIds(
				{
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
					skills: [
						{ type: 'skill', id: 'present_skill' },
						{ type: 'skill', id: 'missing_skill' },
					],
				},
				agentId,
			),
		).resolves.toEqual(['missing_skill']);
	});

	it('deletes unreferenced skills scoped to the current agent', async () => {
		skillRepository.findByAgentId.mockResolvedValue([
			makeDefinition('kept_skill'),
			makeDefinition('orphan_skill'),
		]);

		await service.removeUnreferencedSkills(
			makeAgent({ id: agentId }),
			{
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [{ type: 'skill', id: 'kept_skill' }],
			},
			trx as never,
		);

		expect(skillRepository.deleteByAgentIdAndIds).toHaveBeenCalledWith(
			agentId,
			['orphan_skill'],
			trx,
		);
	});
});

function makeDefinition(
	id: string,
	overrides: Partial<AgentSkillDefinition> = {},
): AgentSkillDefinition {
	return {
		id,
		agentId,
		name: 'Summarize Notes',
		description: 'Summarizes a meeting transcript',
		instructions: 'Extract decisions and action items.',
		allowedTools: null,
		recommendedTools: null,
		interfaceData: null,
		policy: null,
		dependencies: null,
		version: null,
		license: null,
		compatibility: null,
		platforms: null,
		metadata: null,
		linkedFiles: { references: [] },
		...overrides,
	} as AgentSkillDefinition;
}
