import { UserRepository, type User } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	op: z
		.enum([
			'used-by',
			'delete',
			'duplicate',
			'create-instance-skill',
			'edit-skill',
			'add-ref',
			'remove-ref',
			'concurrency',
			'revert',
			'revert-to-version',
			'resolve',
			'use-current',
			'save-skill',
		])
		.describe('Operation to run'),
	skillId: z.string().optional().describe('Hub skill id'),
	agentId: z.string().optional().describe('Agent id'),
	versionId: z.string().optional().describe('agent_history versionId (revert-to-version)'),
	asUser: z.string().optional().describe('Acting user id (defaults to the owner)'),
	name: z.string().optional().describe('Skill or agent name'),
	instructions: z.string().optional().describe('Skill instructions'),
	mcp: z.boolean().default(false).describe('Make the copy available in MCP (duplicate)'),
	rounds: z.coerce.number().int().optional().describe('Rounds for the concurrency op'),
});

type Flags = z.infer<typeof flagsSchema>;

/**
 * Prototype test harness for the skills hub: runs service-level operations that have
 * no MCP tool yet, or that need another acting user. Each op checks the same scope the
 * matching REST route checks. Prints one JSON line prefixed with SKILLS_HUB_RESULT.
 */
@Command({
	name: 'skills-hub:admin',
	description: 'Skills hub prototype operations (test harness)',
	examples: ['--op=used-by --skillId=skill_x', '--op=delete --skillId=skill_x'],
	flagsSchema,
})
export class SkillsHubAdminCommand extends BaseCommand<Flags> {
	async run() {
		let result: unknown;
		try {
			// Config saves read the license state, like on a running instance.
			await this.initLicense();
			result = await this.dispatch(this.flags);
		} catch (error) {
			result = {
				ok: false,
				errorType: error instanceof Error ? error.constructor.name : typeof error,
				error: error instanceof Error ? error.message : String(error),
			};
		}
		process.stdout.write(`SKILLS_HUB_RESULT ${JSON.stringify(result)}\n`);
	}

	private async dispatch(flags: Flags): Promise<unknown> {
		const { SkillHubService } = await import('@/modules/agents/skills-hub/skill-hub.service.js');
		const hub = Container.get(SkillHubService);
		switch (flags.op) {
			case 'used-by':
				return { ok: true, usage: await hub.usedBy(this.required(flags.skillId, 'skillId')) };
			case 'delete':
				await hub.deleteSkill(this.required(flags.skillId, 'skillId'));
				return { ok: true, deleted: flags.skillId };
			case 'duplicate':
				return await this.duplicate(this.required(flags.agentId, 'agentId'), flags.name, flags.mcp);
			case 'create-instance-skill':
				return await this.createInstanceSkill(flags);
			case 'edit-skill':
				return await this.editSkill(flags);
			case 'add-ref':
			case 'remove-ref':
				return await this.changeRef(flags);
			case 'concurrency':
				return await this.concurrency(flags);
			case 'revert':
			case 'revert-to-version':
				return await this.revert(flags);
			case 'resolve':
				return await this.resolve(this.required(flags.agentId, 'agentId'));
			case 'use-current':
				return await this.useCurrent(flags);
			case 'save-skill':
				return await this.saveSkill(flags);
		}
	}

	/** Same call as POST /projects/:projectId/agents/:agentId/skills/:skillId/save. */
	private async saveSkill(flags: Flags) {
		const { AgentSkillsService } = await import('@/modules/agents/agent-skills.service.js');
		const user = await this.user(flags.asUser);
		const agent = await this.agentForUpdate(this.required(flags.agentId, 'agentId'), user);
		const result = await Container.get(AgentSkillsService).saveSkill(
			agent.id,
			agent.projectId,
			this.required(flags.skillId, 'skillId'),
			{ user, modifiedBy: 'user' },
		);
		return { ok: true, as: user.email, ...result };
	}

	/** The agent's draft refs (pins included) and the skill content each one resolves to. */
	private async resolve(agentId: string) {
		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		const { SkillHubService } = await import('@/modules/agents/skills-hub/skill-hub.service.js');
		const { SkillHubRepository } = await import(
			'@/modules/agents/repositories/skill-hub.repository.js'
		);
		const { AgentSkillDependency } = await import(
			'@/modules/agents/entities/agent-skill-dependency.entity.js'
		);
		const agent = await Container.get(AgentRepository).findByIdForDraftWrite(agentId);
		if (!agent) throw new Error(`Agent ${agentId} not found`);
		const hub = Container.get(SkillHubService);
		const skills = await hub.resolveDraftSkills(agent.schema);
		const editable = await hub.resolveEditableSkills(agent.schema);
		const deps = await Container.get(SkillHubRepository)['dataSource'].manager.find(
			AgentSkillDependency,
			{ where: { agentId } },
		);
		return {
			ok: true,
			versionId: agent.versionId,
			activeVersionId: agent.activeVersionId,
			inSync: agent.versionId === agent.activeVersionId,
			refs: agent.schema?.skills ?? [],
			dependencies: deps.map((d) => ({ skillId: d.skillId, skillVersionId: d.skillVersionId })),
			// What the agent runs (saved versions) and what the editor shows (draft rows).
			skills: Object.fromEntries(
				Object.entries(skills).map(([id, skill]) => [
					id,
					{ name: skill.name, text: skill.instructions.slice(0, 90) },
				]),
			),
			editable: Object.fromEntries(
				Object.entries(editable).map(([id, skill]) => [
					id,
					{ name: skill.name, text: skill.instructions.slice(0, 90) },
				]),
			),
		};
	}

	/** "Use current version": a config save that drops the pin from one ref. */
	private async useCurrent(flags: Flags) {
		const user = await this.user(flags.asUser);
		const agent = await this.agentForUpdate(this.required(flags.agentId, 'agentId'), user);
		const skillId = this.required(flags.skillId, 'skillId');
		const { AgentConfigService } = await import('@/modules/agents/agent-config.service.js');
		const { getAgentConfigHash } = await import('@/modules/agents/utils/agent-config-hash.js');
		const configService = Container.get(AgentConfigService);
		const config = await configService.getConfig(agent.id, agent.projectId);
		const next = {
			...config,
			skills: (config.skills ?? []).map((ref) => {
				if (ref.id !== skillId) return ref;
				const { versionId: _dropped, ...following } = ref;
				return following;
			}),
		};
		const saved = await configService.updateConfig(agent.id, agent.projectId, next, user, {
			baseConfigHash: getAgentConfigHash(config),
			modifiedBy: 'user',
		});
		return { ok: true, as: user.email, refs: saved.config.skills ?? [] };
	}

	private async user(id: string | undefined): Promise<User> {
		const users = Container.get(UserRepository);
		const user = id
			? await users.findByIdWithRole(id)
			: await users.findOne({ where: { role: { slug: 'global:owner' } }, relations: ['role'] });
		if (!user) throw new Error(`User ${id ?? 'owner'} not found`);
		return user;
	}

	/** Mirrors `@ProjectScope('agent:update')` on the agent skill and config routes. */
	private async agentForUpdate(agentId: string, user: User) {
		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		const { userHasScopes } = await import('@/permissions.ee/check-access.js');
		const agent = await Container.get(AgentRepository).findByIdForDraftWrite(agentId);
		if (!agent) throw new Error(`Agent ${agentId} not found`);
		if (!(await userHasScopes(user, ['agent:update'], false, { projectId: agent.projectId }))) {
			throw new Error(`Forbidden: ${user.email} lacks agent:update on project ${agent.projectId}`);
		}
		return agent;
	}

	private async createInstanceSkill(flags: Flags) {
		const { SkillHubRepository } = await import(
			'@/modules/agents/repositories/skill-hub.repository.js'
		);
		const { generateNanoId } = await import('@n8n/utils/generate-nano-id');
		const id = `skill_${generateNanoId()}`;
		const name = this.required(flags.name, 'name');
		await Container.get(SkillHubRepository).createSkill(
			{ id, target: { userId: null, projectId: null }, source: 'ui', createdById: null },
			{
				name,
				description: `Instance skill ${name}.`,
				instructions: this.required(flags.instructions, 'instructions'),
				frontmatter: null,
				files: [],
			},
		);
		return { ok: true, skillId: id, name };
	}

	/** Same call as PATCH /projects/:projectId/agents/:agentId/skills/:skillId. */
	private async editSkill(flags: Flags) {
		const { AgentSkillsService } = await import('@/modules/agents/agent-skills.service.js');
		const user = await this.user(flags.asUser);
		const agent = await this.agentForUpdate(this.required(flags.agentId, 'agentId'), user);
		const updates = {
			...(flags.name ? { name: flags.name } : {}),
			...(flags.instructions ? { instructions: flags.instructions } : {}),
		};
		const result = await Container.get(AgentSkillsService).updateSkill(
			agent.id,
			agent.projectId,
			this.required(flags.skillId, 'skillId'),
			updates,
			{ user, modifiedBy: 'user' },
		);
		return { ok: true, as: user.email, skill: { id: result.id, name: result.skill.name } };
	}

	/** add-ref: a config save that adds the ref. remove-ref: the builder "remove skill". */
	private async changeRef(flags: Flags) {
		const user = await this.user(flags.asUser);
		const agent = await this.agentForUpdate(this.required(flags.agentId, 'agentId'), user);
		const skillId = this.required(flags.skillId, 'skillId');
		if (flags.op === 'remove-ref') {
			const { AgentSkillsService } = await import('@/modules/agents/agent-skills.service.js');
			await Container.get(AgentSkillsService).deleteSkill(agent.id, agent.projectId, skillId, {
				user,
				modifiedBy: 'user',
			});
			return { ok: true, as: user.email, detached: skillId };
		}
		const { AgentConfigService } = await import('@/modules/agents/agent-config.service.js');
		const { getAgentConfigHash } = await import('@/modules/agents/utils/agent-config-hash.js');
		const configService = Container.get(AgentConfigService);
		const config = await configService.getConfig(agent.id, agent.projectId);
		const next = {
			...config,
			skills: [...(config.skills ?? []), { type: 'skill' as const, id: skillId }],
		};
		const saved = await configService.updateConfig(agent.id, agent.projectId, next, user, {
			baseConfigHash: getAgentConfigHash(config),
			modifiedBy: 'user',
		});
		return { ok: true, as: user.email, refs: saved.config.skills ?? [] };
	}

	/**
	 * Fix 4 check. `deterministic`: an agent edit loads the agent, a skill edit commits,
	 * then the agent edit saves through the same revision fence every draft write uses.
	 * `parallel`: real config saves and skill edits started together, several rounds.
	 */
	private async concurrency(flags: Flags) {
		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		const { AgentSkillsService } = await import('@/modules/agents/agent-skills.service.js');
		const { AgentConfigService } = await import('@/modules/agents/agent-config.service.js');
		const { getAgentConfigHash } = await import('@/modules/agents/utils/agent-config-hash.js');
		const { markAgentDraftDirty, saveAgentDraftFenced } = await import(
			'@/modules/agents/utils/agent-draft.utils.js'
		);
		const user = await this.user(flags.asUser);
		const agents = Container.get(AgentRepository);
		const skills = Container.get(AgentSkillsService);
		const configs = Container.get(AgentConfigService);
		const agentId = this.required(flags.agentId, 'agentId');
		const skillId = this.required(flags.skillId, 'skillId');
		const row = async () => {
			const a = await agents.findByIdForDraftWrite(agentId);
			return {
				versionId: a?.versionId,
				activeVersionId: a?.activeVersionId,
				revision: a?.revision,
			};
		};
		const edit = async (text: string) =>
			await skills.updateSkill(
				agentId,
				(await agents.findByIdForDraftWrite(agentId))!.projectId,
				skillId,
				{ instructions: text },
				{ user, modifiedBy: 'user' },
			);

		// Deterministic interleave.
		const before = await row();
		const stale = await agents.findByIdForDraftWrite(agentId);
		if (!stale?.schema) throw new Error('Agent has no config');
		stale.schema = { ...stale.schema, instructions: `${stale.schema.instructions} (edited)` };
		markAgentDraftDirty(stale);
		await edit(`Planted sentence: concurrency check ${Date.now()}.`);
		const afterSkillEdit = await row();
		let agentEdit: string;
		try {
			await saveAgentDraftFenced(agents, stale);
			agentEdit = 'saved';
		} catch (error) {
			agentEdit = `failed: ${error instanceof Error ? error.message : String(error)}`;
		}
		const afterAgentEdit = await row();

		// Parallel rounds with the real write paths.
		const rounds = flags.rounds ?? 5;
		const outcomes: Array<{ skill: string; config: string }> = [];
		for (let i = 0; i < rounds; i++) {
			const projectId = (await agents.findByIdForDraftWrite(agentId))!.projectId;
			const config = await configs.getConfig(agentId, projectId);
			const [s, c] = await Promise.allSettled([
				edit(`Planted sentence: parallel round ${i} at ${Date.now()}.`),
				configs.updateConfig(
					agentId,
					projectId,
					{
						...config,
						instructions: `${config.instructions.replace(/ \(round \d+\)$/, '')} (round ${i})`,
					},
					user,
					{ baseConfigHash: getAgentConfigHash(config), modifiedBy: 'user' },
				),
			]);
			outcomes.push({
				skill: s.status === 'fulfilled' ? 'ok' : `failed: ${String(s.reason?.message ?? s.reason)}`,
				config:
					c.status === 'fulfilled' ? 'ok' : `failed: ${String(c.reason?.message ?? c.reason)}`,
			});
		}
		return {
			ok: true,
			deterministic: { before, afterSkillEdit, agentEdit, afterAgentEdit },
			parallel: outcomes,
			final: await row(),
		};
	}

	/**
	 * revert: same call as POST .../revert-to-published. revert-to-version: same call as
	 * POST .../versions/:versionId/revert. Both return the refs with their pins.
	 */
	private async revert(flags: Flags) {
		const { AgentPublishService } = await import('@/modules/agents/agent-publish.service.js');
		const user = await this.user(flags.asUser);
		const agent = await this.agentForUpdate(this.required(flags.agentId, 'agentId'), user);
		const publish = Container.get(AgentPublishService);
		const reverted =
			flags.op === 'revert-to-version'
				? await publish.revertToVersion(
						agent.id,
						agent.projectId,
						this.required(flags.versionId, 'versionId'),
						user,
						'user',
					)
				: await publish.revertToPublishedAgent(agent.id, agent.projectId, user, 'user');
		return {
			ok: true,
			as: user.email,
			versionId: reverted.versionId,
			activeVersionId: reverted.activeVersionId,
			inSync: reverted.versionId === reverted.activeVersionId,
			refs: reverted.schema?.skills ?? [],
		};
	}

	/** Same call the REST duplicate makes: the source config, its skill bodies, and a user. */
	private async duplicate(agentId: string, name: string | undefined, mcp: boolean) {
		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		const { AgentsService } = await import('@/modules/agents/agents.service.js');
		const { AgentSkillsService } = await import('@/modules/agents/agent-skills.service.js');
		const source = await Container.get(AgentRepository).findByIdForDraftWrite(agentId);
		if (!source?.schema) throw new Error(`Agent ${agentId} not found or has no config`);
		const owner = await this.user(undefined);
		const skills = await Container.get(AgentSkillsService).listSkills(agentId, source.projectId);
		const copyName = name ?? `${source.name} (copy)`;
		const copy = await Container.get(AgentsService).create(source.projectId, copyName, {
			schema: { ...source.schema, name: copyName },
			skills,
			tools: source.tools,
			user: owner,
			availableInMCP: mcp,
		});
		return {
			ok: true,
			agentId: copy.id,
			projectId: copy.projectId,
			refs: copy.schema?.skills ?? [],
		};
	}

	private required(value: string | undefined, flag: string): string {
		if (!value) throw new Error(`--${flag} is required`);
		return value;
	}

	async catch(error: Error) {
		this.logError(error);
	}
}
