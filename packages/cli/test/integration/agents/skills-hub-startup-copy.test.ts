import type { AgentSkill } from '@n8n/api-types';
import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { setSkillsHubFlag } from '@/modules/agents/__tests__/test-utils/skills-hub-flag';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SkillRepository } from '@/modules/agents/repositories/skill.repository';
import { SkillsHubStartupCopy } from '@/modules/agents/skills/skills-hub-startup-copy';
import { Telemetry } from '@/telemetry';

function body(name: string, instructions = `${name} instructions.`): AgentSkill {
	return { name, description: `${name} description`, instructions };
}

type InlineRef = { type: 'skill'; id: string; enabled?: boolean };

describe('SkillsHubStartupCopy', () => {
	let project: Project;
	let agents: AgentRepository;
	let histories: AgentHistoryRepository;
	let skills: SkillRepository;
	let skillRefs: AgentSkillRefsService;
	let copy: SkillsHubStartupCopy;

	beforeAll(async () => {
		mockInstance(Telemetry);
		mockInstance(AgentRuntimeCacheService);
		mockInstance(AgentUpdateBroadcaster);
		await testModules.loadModules(['agents']);
		await testDb.init();
		agents = Container.get(AgentRepository);
		histories = Container.get(AgentHistoryRepository);
		skills = Container.get(SkillRepository);
		skillRefs = Container.get(AgentSkillRefsService);
		copy = Container.get(SkillsHubStartupCopy);
		// The copy runs on the leader only.
		Container.get(InstanceSettings).markAsLeader();
	});

	beforeEach(async () => {
		project = await createTeamProject();
		await setSkillsHubFlag(true);
	});

	afterEach(async () => {
		await agents.delete({});
		await skills.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** An agent as the legacy path stores it: refs in `schema.skills`, bodies in `skills`. */
	async function legacyAgent(refs: InlineRef[], bodies: Record<string, AgentSkill>) {
		return await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				schema: { name: 'Agent', model: '', instructions: 'Help.', skills: refs } as never,
				skills: bodies,
				integrations: [],
				tools: {},
				versionId: randomUUID(),
			}),
		);
	}

	/** A published version as the legacy path stores it. */
	async function legacyVersion(
		agent: Agent,
		refs: InlineRef[],
		bodies: Record<string, AgentSkill>,
	) {
		const versionId = randomUUID();
		await histories.save(
			histories.create({
				versionId,
				agentId: agent.id,
				author: 'Test',
				schema: { name: 'Agent', model: '', instructions: 'Help.', skills: refs } as never,
				skills: bodies,
			}),
		);
		await agents.update({ id: agent.id }, { activeVersionId: versionId });
		return versionId;
	}

	const instructionsOf = (record: Record<string, AgentSkill>) =>
		Object.fromEntries(Object.entries(record).map(([id, skill]) => [id, skill.instructions]));

	it('copies the draft and the published versions as agent skills, and keeps the legacy columns', async () => {
		const refs: InlineRef[] = [
			{ type: 'skill', id: 'tone' },
			{ type: 'skill', id: 'pricing' },
		];
		const agent = await legacyAgent(refs, {
			tone: body('Tone', 'Draft tone.'),
			pricing: body('Pricing'),
		});
		const versionId = await legacyVersion(agent, refs, {
			tone: body('Tone', 'Published tone.'),
			pricing: body('Pricing'),
		});

		const counts = await copy.copyAll();

		expect(counts).toMatchObject({ agents: 1, skills: 2, failed: 0 });
		// The draft follows the newest version, which holds its text.
		const draft = await skillRefs.readDraft(agent, {});
		expect(draft.skillRefs).toEqual(refs.map(({ id }) => ({ type: 'skill', id })));
		expect(instructionsOf(draft.skills)).toEqual({
			tone: 'Draft tone.',
			pricing: 'Pricing instructions.',
		});
		// The published version pins the text it ran.
		const version = await histories.findOneByOrFail({ versionId });
		expect(instructionsOf((await skillRefs.readVersion(version, {})).skills)).toEqual({
			tone: 'Published tone.',
			pricing: 'Pricing instructions.',
		});
		// Each copy is a skill of this agent only.
		expect(await skills.findByIds(['tone', 'pricing'])).toEqual([
			expect.objectContaining({ projectId: null, agentId: agent.id, source: 'agent' }),
			expect.objectContaining({ projectId: null, agentId: agent.id, source: 'agent' }),
		]);
		const row = await agents.findOneByOrFail({ id: agent.id });
		expect(row.schema?.skills).toEqual(refs);
		expect(row.skills).toEqual(agent.skills);
	});

	it('writes nothing on a second run', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await legacyVersion(agent, [{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await copy.copyAll();
		const before = await skills.findAgentSkillVersions(agent.id);

		const counts = await copy.copyAll();

		expect(counts).toMatchObject({ agents: 0, skills: 0, versions: 0, pins: 0 });
		expect(await skills.findAgentSkillVersions(agent.id)).toEqual(before);
	});

	it('does not copy a ref that was switched off', async () => {
		const agent = await legacyAgent(
			[
				{ type: 'skill', id: 'tone' },
				{ type: 'skill', id: 'old', enabled: false },
			],
			{ tone: body('Tone'), old: body('Old') },
		);

		await copy.copyAll();

		expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: 'tone' }]);
		expect(await skills.findByIds(['old'])).toEqual([]);
	});

	it('gives a second agent with the same ref id its own skill', async () => {
		const first = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone', 'A.') });
		const second = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone', 'B.') });

		await copy.copyAll();

		// One agent keeps the id, the other gets a new one, and each runs its own text.
		const [firstRef] = await skillRefs.refsForDraft(first, {});
		const [secondRef] = await skillRefs.refsForDraft(second, {});
		expect([firstRef.id, secondRef.id].filter((id) => id === 'tone')).toHaveLength(1);
		expect(instructionsOf((await skillRefs.readDraft(first, {})).skills)).toEqual({
			[firstRef.id]: 'A.',
		});
		expect(instructionsOf((await skillRefs.readDraft(second, {})).skills)).toEqual({
			[secondRef.id]: 'B.',
		});
	});

	it('does not attach a skill again after it was detached', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await copy.copyAll();
		await skillRefs.replaceDraftRefs(agent, [], {});

		await copy.copyAll();

		expect(await skillRefs.refsForDraft(agent, {})).toEqual([]);
	});

	it('pins a version that was published with the flag off to the matching hub version', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await copy.copyAll();
		const versionId = await legacyVersion(agent, [{ type: 'skill', id: 'tone' }], {
			tone: body('Tone'),
		});

		const counts = await copy.copyAll();

		expect(counts).toMatchObject({ skills: 0, versions: 0, pins: 1 });
		expect(await skills.findPinnedSkillIds(versionId)).toEqual(['tone']);
	});

	it('copies nothing while the flag is off', async () => {
		await setSkillsHubFlag(false);
		await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });

		await copy.runOnStartup();

		expect(await skills.findByIds(['tone'])).toEqual([]);
	});

	it('names the agents with skills in the hub when the flag is off', async () => {
		const agent = await legacyAgent([{ type: 'skill', id: 'tone' }], { tone: body('Tone') });
		await copy.copyAll();
		await setSkillsHubFlag(false);
		const logger = Container.get(Logger);
		const warn = vi.spyOn(logger, 'warn');

		await copy.runOnStartup();

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('The skills hub is off'), {
			agents: 1,
			agentIds: [agent.id],
		});
	});
});
