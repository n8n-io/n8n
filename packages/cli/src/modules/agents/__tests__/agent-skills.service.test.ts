/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs and unbound-method references are acceptable test idioms */
import type { AgentSkill } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentSkillsService } from '../agent-skills.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SkillHubRepository } from '../repositories/skill-hub.repository';
import type { SkillHubService } from '../skills-hub/skill-hub.service';
import { getAgentSkillHash } from '../utils/agent-config-hash';

const agentId = 'agent-1';
const projectId = 'project-1';
const telemetryContext = { user: { id: 'user-1' } as never, modifiedBy: 'user' as const };
const versionId = 'v1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		versionId,
		schema: null,
		activeVersionId: null,
		activeVersion: null,
		tools: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as Agent;
}

const baseSchema = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

describe('AgentSkillsService', () => {
	let service: AgentSkillsService;
	let agentRepository: Mocked<AgentRepository>;
	let modificationTelemetry: Mocked<AgentModificationTelemetryService>;
	let agentUpdateBroadcaster: Mocked<AgentUpdateBroadcaster>;
	let skillHub: Mocked<SkillHubService>;
	let skillHubRepository: Mocked<SkillHubRepository>;
	/** Hub draft rows, keyed by skill id. `writeDraft` updates them like the real hub. */
	let drafts: Record<string, AgentSkill>;
	/** Saved versions the agent runs, keyed by skill id. */
	let savedSkills: Record<string, AgentSkill>;

	const trx = { name: 'trx' } as never;

	const skill = {
		name: 'Summarize Notes',
		description: 'Summarizes a meeting transcript',
		instructions: 'Extract decisions and action items.',
	};

	beforeEach(() => {
		vi.clearAllMocks();

		drafts = {};
		savedSkills = {};
		agentRepository = mock<AgentRepository>();
		agentRepository.saveDraftFenced.mockResolvedValue(true);
		modificationTelemetry = mock<AgentModificationTelemetryService>();
		agentUpdateBroadcaster = mock<AgentUpdateBroadcaster>();
		skillHub = mock<SkillHubService>();
		skillHubRepository = mock<SkillHubRepository>();

		skillHubRepository.inTransaction.mockImplementation(async (_trx, fn) => await fn(trx));
		let nextSkillNumber = 0;
		skillHub.createSkillForAgent.mockImplementation(async (_projectId, created) => ({
			id: `skill_${String(++nextSkillNumber).padStart(16, '0')}`,
			name: created.name,
		}));
		skillHub.resolveDraftSkills.mockImplementation(async () => ({ ...savedSkills }));
		skillHub.resolveEditableSkills.mockImplementation(async (schema) =>
			Object.fromEntries(
				(schema?.skills ?? []).flatMap((ref) => (drafts[ref.id] ? [[ref.id, drafts[ref.id]]] : [])),
			),
		);
		skillHub.writeDraft.mockImplementation(async (skillId, written) => {
			drafts[skillId] = written;
		});

		service = new AgentSkillsService(
			mockLogger(),
			agentRepository,
			modificationTelemetry,
			agentUpdateBroadcaster,
			skillHub,
			skillHubRepository,
		);
	});

	it('creates a skill without attaching it to the config', async () => {
		const agent = makeAgent({ schema: { ...baseSchema, skills: [] } });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.createSkill(agentId, projectId, skill, telemetryContext);

		expect(result).toEqual({
			id: expect.stringMatching(/^skill_[A-Za-z0-9]{16}$/),
			skill,
			skillHash: expect.stringMatching(/^[a-f0-9]{64}$/),
			versionId: agent.versionId,
		});
		expect(skillHub.createSkillForAgent).toHaveBeenCalledWith(projectId, skill, 'user-1', trx);
		// A detached skill does not change the agent row.
		expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		expect(agent.schema?.skills).toEqual([]);
		expect(skillHub.clearRuntimes).not.toHaveBeenCalled();
		expect(modificationTelemetry.record).not.toHaveBeenCalled();
	});

	it('stores references without derived metadata when creating a skill', async () => {
		const agent = makeAgent({ schema: { ...baseSchema } });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const references = [{ path: 'references/guide.md', content: '# Guide' }];

		const result = await service.createSkill(
			agentId,
			projectId,
			{ ...skill, references },
			telemetryContext,
		);

		expect(result.skill.references).toEqual(references);
		expect(skillHub.createSkillForAgent).toHaveBeenCalledWith(
			projectId,
			{ ...skill, references },
			'user-1',
			trx,
		);
	});

	describe('createSkills', () => {
		const skillTwo = {
			name: 'Draft Follow-up',
			description: 'Drafts a follow-up email',
			instructions: 'Summarize next steps and send a draft.',
		};

		it('creates multiple skills with one load and one transaction, preserving input order', async () => {
			const agent = makeAgent({ schema: { ...baseSchema, skills: [] } });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const results = await service.createSkills(
				agentId,
				projectId,
				[skill, skillTwo],
				telemetryContext,
			);

			expect(results).toHaveLength(2);
			expect(results[0].skill).toEqual(skill);
			expect(results[1].skill).toEqual(skillTwo);
			expect(results[0].id).not.toEqual(results[1].id);
			expect(results.map((r) => r.versionId)).toEqual([agent.versionId, agent.versionId]);

			expect(agentRepository.findByIdAndProjectId).toHaveBeenCalledTimes(1);
			expect(skillHubRepository.inTransaction).toHaveBeenCalledTimes(1);
			expect(skillHub.createSkillForAgent.mock.calls.map((call) => call[1])).toEqual([
				skill,
				skillTwo,
			]);
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		});

		it('rejects an empty batch before loading or writing anything', async () => {
			await expect(service.createSkills(agentId, projectId, [], telemetryContext)).rejects.toThrow(
				'At least one skill is required.',
			);

			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
			expect(skillHub.createSkillForAgent).not.toHaveBeenCalled();
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		});

		it('rejects the whole batch without saving when a name collides with an existing skill', async () => {
			savedSkills = { summarize_notes: skill };
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
				}),
			);

			await expect(
				service.createSkills(agentId, projectId, [skillTwo, { ...skill }], telemetryContext),
			).rejects.toThrow('Agent already has a skill with a name like "Summarize Notes".');

			expect(skillHub.createSkillForAgent).not.toHaveBeenCalled();
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		});

		it('rejects the whole batch without saving when two items in the batch share a name', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await expect(
				service.createSkills(
					agentId,
					projectId,
					[skill, { ...skill, name: '  summarize notes ' }],
					telemetryContext,
				),
			).rejects.toThrow('Duplicate skill name in batch: "summarize notes".');

			expect(skillHub.createSkillForAgent).not.toHaveBeenCalled();
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		});

		it('rejects the whole batch without saving when one item is invalid', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await expect(
				service.createSkills(
					agentId,
					projectId,
					[skill, { ...skillTwo, name: '' }],
					telemetryContext,
				),
			).rejects.toThrow('Invalid agent skill');

			expect(skillHub.createSkillForAgent).not.toHaveBeenCalled();
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		});
	});

	it('creates and attaches a skill on the agent when requested', async () => {
		const agent = makeAgent({ schema: { ...baseSchema, skills: [] } });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.createAndAttachSkill(agentId, projectId, skill, telemetryContext);

		expect(skillHub.createSkillForAgent).toHaveBeenCalledWith(projectId, skill, 'user-1', trx);
		expect(agent.schema?.skills).toEqual([{ type: 'skill', id: result.id }]);
		expect(agentRepository.saveDraftFenced).toHaveBeenCalledWith(agent, trx);
		expect(skillHub.refreshDependencies).toHaveBeenCalledWith(agent, trx);
		expect(skillHub.clearRuntimes).toHaveBeenCalledWith([agentId]);
	});

	it('loads one skill from the agent', async () => {
		drafts = { summarize_notes: skill };
		const agent = makeAgent({
			schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.getSkill(agentId, projectId, 'summarize_notes')).resolves.toEqual(skill);
		expect(skillHub.resolveEditableSkills).toHaveBeenCalledWith(agent.schema);
		expect(skillHub.clearRuntimes).not.toHaveBeenCalled();
	});

	it('updates an existing skill on the agent and preserves omitted references', async () => {
		const skillWithReferences = {
			...skill,
			references: [{ path: 'references/guide.md', content: '# Guide' }],
		};
		drafts = { summarize_notes: skillWithReferences };
		const agent = makeAgent({
			schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.updateSkill(
			agentId,
			projectId,
			'summarize_notes',
			{ description: 'Summarizes support notes' },
			{ ...telemetryContext, pushRef: 'writer-push-ref' },
			getAgentSkillHash(skillWithReferences),
		);

		expect(result).toEqual({
			id: 'summarize_notes',
			skill: {
				...skill,
				description: 'Summarizes support notes',
				references: [{ path: 'references/guide.md', content: '# Guide' }],
			},
			skillHash: expect.stringMatching(/^[a-f0-9]{64}$/),
			versionId: agent.versionId,
		});
		expect(skillHub.assertCanEditSkills).toHaveBeenCalledWith(telemetryContext.user, [
			'summarize_notes',
		]);
		expect(skillHub.writeDraft).toHaveBeenCalledWith('summarize_notes', result.skill, trx);
		// Autosave writes the draft row only: no agent runs it, so the agent row and the
		// runtimes stay as they are.
		expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		expect(skillHub.clearRuntimes).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).toHaveBeenCalledWith(
			{ projectId, agentId, source: 'user' },
			'writer-push-ref',
		);
	});

	it('rejects an update based on a stale skill without mutating the agent', async () => {
		drafts = { summarize_notes: skill };
		const agent = makeAgent({
			schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(
			service.updateSkill(
				agentId,
				projectId,
				'summarize_notes',
				{ instructions: 'Replace newer work' },
				telemetryContext,
				'stale-hash',
			),
		).rejects.toThrow('Skill was changed elsewhere; reload to get the latest version');

		expect(drafts.summarize_notes).toBe(skill);
		expect(skillHub.writeDraft).not.toHaveBeenCalled();
		expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		expect(modificationTelemetry.record).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
	});

	it('removes optional list fields when an update clears them', async () => {
		drafts = {
			summarize_notes: {
				...skill,
				allowedTools: ['load_workflow'],
				references: [{ path: 'references/guide.md', content: '# Guide' }],
			},
		};
		const agent = makeAgent({
			schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.updateSkill(
			agentId,
			projectId,
			'summarize_notes',
			{ allowedTools: undefined, references: [] },
			telemetryContext,
		);

		expect(result.skill).not.toHaveProperty('allowedTools');
		expect(result.skill).not.toHaveProperty('references');
		expect(skillHub.writeDraft).toHaveBeenCalledWith('summarize_notes', skill, trx);
	});

	it('rejects creating a skill with a duplicate name', async () => {
		savedSkills = { summarize_notes: skill };
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
			}),
		);

		await expect(
			service.createAndAttachSkill(agentId, projectId, skill, telemetryContext),
		).rejects.toThrow('Agent already has a skill with a name like "Summarize Notes".');
		expect(skillHub.createSkillForAgent).not.toHaveBeenCalled();
	});

	it('writes a rename to the draft without a name check, which runs at Save', async () => {
		drafts = {
			summarize_notes: skill,
			other_skill: { name: 'Other Skill', description: 'desc', instructions: 'Use it' },
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				schema: {
					...baseSchema,
					skills: [
						{ type: 'skill', id: 'summarize_notes' },
						{ type: 'skill', id: 'other_skill' },
					],
				},
			}),
		);

		await service.updateSkill(
			agentId,
			projectId,
			'summarize_notes',
			{ name: 'Other Skill' },
			telemetryContext,
		);

		expect(skillHub.writeDraft).toHaveBeenCalledWith(
			'summarize_notes',
			{ ...skill, name: 'Other Skill' },
			trx,
		);
	});

	it('propagates a name clash that Save reports', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
			}),
		);
		skillHub.saveVersion.mockRejectedValue(
			new Error('Agent already has a skill with a name like "Other Skill".'),
		);

		await expect(
			service.saveSkill(agentId, projectId, 'summarize_notes', telemetryContext),
		).rejects.toThrow('Agent already has a skill with a name like "Other Skill".');
		expect(skillHub.clearRuntimes).not.toHaveBeenCalled();
		expect(modificationTelemetry.record).not.toHaveBeenCalled();
	});

	it('deletes a skill and removes its config ref', async () => {
		const agent = makeAgent({
			schema: {
				...baseSchema,
				tools: [{ type: 'custom', id: 'custom_tool' }],
				skills: [{ type: 'skill', id: 'summarize_notes' }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.deleteSkill(agentId, projectId, 'summarize_notes', telemetryContext);

		expect(agentRepository.saveDraftFenced).toHaveBeenCalledWith(agent, trx);
		expect(agent.schema?.tools).toEqual([{ type: 'custom', id: 'custom_tool' }]);
		expect(agent.schema?.skills).toEqual([]);
		expect(skillHub.refreshDependencies).toHaveBeenCalledWith(agent, trx);
		expect(skillHub.clearRuntimes).toHaveBeenCalledWith([agentId]);
		// Detaching keeps the hub skill.
		expect(skillHub.deleteSkill).not.toHaveBeenCalled();
	});

	it('reports skill body changes through lifecycle telemetry on Save and stays silent on autosave', async () => {
		drafts = { summarize_notes: skill };
		const agent = makeAgent({
			schema: { ...baseSchema, skills: [{ type: 'skill', id: 'summarize_notes' }] },
			integrations: [],
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.updateSkill(
			agentId,
			projectId,
			'summarize_notes',
			{ description: 'Updated description' },
			telemetryContext,
		);
		expect(skillHub.writeDraft).toHaveBeenCalledTimes(1);
		expect(modificationTelemetry.record).not.toHaveBeenCalled();

		skillHub.saveVersion.mockResolvedValue({ versionId: 'skill-v1', version: 1, created: true });
		skillHub.markDependentsDirty.mockResolvedValue({ dependents: [agentId], written: [] });
		agentRepository.findByIdForDraftWrite.mockResolvedValue(agent);

		await expect(
			service.saveSkill(agentId, projectId, 'summarize_notes', telemetryContext),
		).resolves.toEqual({ id: 'summarize_notes', versionId: 'skill-v1', version: 1, created: true });

		expect(skillHub.clearRuntimes).toHaveBeenCalledWith([agentId]);
		expect(modificationTelemetry.record).toHaveBeenCalledWith(
			expect.objectContaining({
				by: 'user',
				changedParts: ['skills'],
				wasUnconfigured: false,
			}),
		);

		vi.clearAllMocks();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		await service.updateSkill(
			agentId,
			projectId,
			'summarize_notes',
			{ description: 'Updated description' },
			telemetryContext,
		);
		expect(skillHub.writeDraft).not.toHaveBeenCalled();
		expect(modificationTelemetry.record).not.toHaveBeenCalled();
	});

	it('reports an attached skill on an unconfigured agent as unconfigured', async () => {
		const agent = makeAgent({
			schema: { name: 'Test Agent', model: '', instructions: '', skills: [] },
			integrations: [],
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.createAndAttachSkill(agentId, projectId, skill, telemetryContext);

		expect(modificationTelemetry.record).toHaveBeenCalledWith(
			expect.objectContaining({
				changedParts: ['skills'],
				wasUnconfigured: true,
			}),
		);
		// record itself suppresses blank-to-blank; the service still reports the write.
	});
});
