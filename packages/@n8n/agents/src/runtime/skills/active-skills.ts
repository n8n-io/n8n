import type { ModelMessage } from 'ai';

import { formatActiveSkill } from '../../skills/tools';
import {
	SKILL_LOAD_TOOL_NAME,
	type RuntimeSkillContent,
	type RuntimeSkillSource,
	type RuntimeSkillStateScope,
	type RuntimeSkillStateStore,
} from '../../skills/types';
import type { AgentPersistenceOptions } from '../../types/sdk/agent';
import type { AgentMessageList } from '../model/message-list';

/** Keeps trusted skill instructions outside the conversation's compaction window. */
export class ActiveSkills {
	private readonly loaded = new Map<string, RuntimeSkillContent>();
	private list?: AgentMessageList;
	private scope?: RuntimeSkillStateScope;
	private pendingSave = Promise.resolve();

	constructor(
		private readonly source: RuntimeSkillSource,
		private readonly agentName: string,
		private readonly store?: RuntimeSkillStateStore,
	) {}

	async restore(list: AgentMessageList, persistence?: AgentPersistenceOptions): Promise<void> {
		this.loaded.clear();
		this.list = list;
		this.scope = persistence
			? {
					threadId: persistence.threadId,
					resourceId: persistence.resourceId,
					agentName: this.agentName,
				}
			: undefined;
		const stored =
			list.activeSkillIds === undefined && this.scope
				? await this.store?.load(this.scope)
				: undefined;
		const ids = list.activeSkillIds ?? stored ?? [...this.recordedLoads(list).values()];
		const registered = new Set(this.source.registry.skills.map(({ id }) => id));
		for (const id of new Set(ids)) {
			if (!registered.has(id)) continue;
			const skill = await this.source.loadSkill(id);
			if (skill) this.loaded.set(id, skill);
		}
		list.activeSkillIds = [...this.loaded.keys()];
		const storeIsCurrent =
			stored !== undefined &&
			new Set(stored).size === this.loaded.size &&
			stored.every((id) => this.loaded.has(id));
		if (!storeIsCurrent && (ids.length > 0 || stored !== undefined)) await this.persist();
	}

	async load(skillId: string): Promise<RuntimeSkillContent | null> {
		if (!this.source.registry.skills.some(({ id }) => id === skillId)) return null;
		const skill = this.loaded.get(skillId) ?? (await this.source.loadSkill(skillId));
		if (!skill) return null;
		if (!this.list) throw new Error('Active skills must be restored before loading');
		if (!this.loaded.has(skillId)) {
			this.loaded.set(skillId, skill);
			this.list.activeSkillIds = [...this.loaded.keys()];
			await this.persist();
		}
		return skill;
	}

	instructions(): string | undefined {
		if (this.loaded.size === 0) return undefined;
		const sections = [...this.loaded].flatMap(([id, skill]) => {
			const entry = this.source.registry.skills.find((candidate) => candidate.id === id);
			return entry ? [formatActiveSkill(skill, entry)] : [];
		});
		return [
			'<active_skills>',
			'Use these current skill versions when relevant to the task. Earlier tool results may describe older versions.',
			...sections,
			'</active_skills>',
		].join('\n\n');
	}

	/** Old conversations can contain full skill bodies. Do not replay an obsolete version. */
	modelMessages(messages: ModelMessage[], list: AgentMessageList): ModelMessage[] {
		const loads = this.recordedLoads(list);
		return messages.map((message) => {
			if (message.role !== 'tool') return message;
			return {
				...message,
				content: message.content.map((part) => {
					if (part.type !== 'tool-result') return part;
					const skillId = loads.get(part.toolCallId);
					if (!skillId) return part;
					return {
						...part,
						output: {
							type: 'json' as const,
							value: { skillId, active: this.loaded.has(skillId) },
						},
					};
				}),
			};
		});
	}

	private recordedLoads(list: AgentMessageList): Map<string, string> {
		const loads = new Map<string, string>();
		for (const message of list.messages()) {
			if (!('content' in message)) continue;
			for (const part of message.content) {
				if (
					part.type !== 'tool-call' ||
					part.toolName !== SKILL_LOAD_TOOL_NAME ||
					part.state !== 'resolved' ||
					part.canceled ||
					!part.input ||
					typeof part.input !== 'object' ||
					Array.isArray(part.input) ||
					!part.output ||
					typeof part.output !== 'object' ||
					Array.isArray(part.output)
				)
					continue;
				if (part.output.success !== true && part.output.type !== 'content') continue;
				const { skillId, name, filePath } = part.input;
				if (typeof filePath === 'string' && !['', '/', '.', 'SKILL.md'].includes(filePath.trim()))
					continue;
				const requested =
					typeof skillId === 'string' ? skillId : typeof name === 'string' ? name : undefined;
				if (!requested) continue;
				const entry = this.source.registry.skills.find(
					(skill) => skill.id === requested || skill.name === requested,
				);
				loads.set(part.toolCallId, entry?.id ?? requested);
			}
		}
		return loads;
	}

	private async persist(): Promise<void> {
		const scope = this.scope;
		const store = this.store;
		if (!scope || !store) return;
		const ids = [...(this.list?.activeSkillIds ?? [])];
		// Concurrent tool calls must not overwrite a newer activation with an older set.
		const save = this.pendingSave.then(async () => await store.save(scope, ids));
		this.pendingSave = save.catch(() => undefined);
		await save;
	}
}
