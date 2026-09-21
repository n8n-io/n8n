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

	async load(
		skillId: string,
		anchor?: { toolCallId: string },
	): Promise<RuntimeSkillContent | null> {
		if (!this.source.registry.skills.some(({ id }) => id === skillId)) return null;
		const skill = this.loaded.get(skillId) ?? (await this.source.loadSkill(skillId));
		if (!skill) return null;
		if (!this.list) throw new Error('Active skills must be restored before loading');
		if (!this.loaded.has(skillId)) {
			this.loaded.set(skillId, skill);
			this.list.activeSkillIds = [...this.loaded.keys()];
			// Only the first activation anchors the skill; a repeat load must not
			// move the instructions and rewrite the cached prefix behind them.
			if (anchor) this.list.markToolCallActivatedSkill(anchor.toolCallId, skillId);
			await this.persist();
		}
		return skill;
	}

	toolDependencies(): string[] {
		return [
			...new Set([...this.loaded.values()].flatMap((skill) => skill.dependencies?.tools ?? [])),
		];
	}

	/**
	 * All active skills as one block for the top-level system prompt. Used
	 * only for models that cannot take system messages mid-conversation; every
	 * activation changes this block and so rewrites the cached prefix.
	 */
	instructions(): string | undefined {
		const sections = this.formattedSkills().map(([, text]) => text);
		if (sections.length === 0) return undefined;
		return [
			'<active_skills>',
			'Use these current skill versions when relevant to the task. Earlier tool results may describe older versions.',
			...sections,
			'</active_skills>',
		].join('\n\n');
	}

	/**
	 * Per-call view of the conversation for the model.
	 *
	 * Always collapses recorded `load_skill` results to `{ skillId, active }`:
	 * old conversations can contain full skill bodies, and an obsolete version
	 * must not be replayed.
	 *
	 * With `inMessages`, each active skill is also inserted as a system message
	 * directly after the tool result that activated it. The prompt then only
	 * grows on activation, so the tool block, system prompt and earlier
	 * conversation stay cached (request-level caching reuses any prefix a
	 * prior request wrote). Skills whose anchor is not in the visible window
	 * (compacted away, or activated before anchors were recorded) go after the
	 * first user message so they stay mid-conversation rather than being
	 * hoisted into the top-level system prompt.
	 */
	modelMessages(
		messages: ModelMessage[],
		list: AgentMessageList,
		options?: { inMessages?: boolean },
	): ModelMessage[] {
		const loads = this.recordedLoads(list);
		const collapsed = messages.map((message) => {
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
		if (!options?.inMessages) return collapsed;

		const skills = this.formattedSkills();
		if (skills.length === 0) return collapsed;
		const anchors = this.anchors(list, loads);
		const pending = new Map(skills);
		const out: ModelMessage[] = [];
		for (const message of collapsed) {
			out.push(message);
			if (message.role !== 'tool') continue;
			const resultIds = new Set(
				message.content.flatMap((part) => (part.type === 'tool-result' ? [part.toolCallId] : [])),
			);
			for (const [skillId, text] of skills) {
				const anchor = anchors.get(skillId);
				if (!pending.has(skillId) || !anchor || !resultIds.has(anchor)) continue;
				out.push({ role: 'system', content: text });
				pending.delete(skillId);
			}
		}
		if (pending.size > 0) {
			const firstUser = out.findIndex((message) => message.role === 'user');
			const fallback: ModelMessage[] = [...pending.values()].map((text) => ({
				role: 'system',
				content: text,
			}));
			out.splice(firstUser + 1, 0, ...fallback);
		}
		return out;
	}

	/** `[skillId, prompt text]` for each active skill, in activation order. */
	private formattedSkills(): Array<[string, string]> {
		return [...this.loaded].flatMap(([id, skill]) => {
			const entry = this.source.registry.skills.find((candidate) => candidate.id === id);
			return entry ? [[id, formatActiveSkill(skill, entry)] as [string, string]] : [];
		});
	}

	/**
	 * skillId → toolCallId of the call that first activated it. Reads the
	 * `activatedSkillIds` stamp the runtime writes on activation, and falls
	 * back to recorded `load_skill` calls for history that predates the stamp.
	 */
	private anchors(list: AgentMessageList, loads: Map<string, string>): Map<string, string> {
		const anchors = new Map<string, string>();
		for (const message of list.messages()) {
			if (!('content' in message)) continue;
			for (const part of message.content) {
				if (part.type !== 'tool-call') continue;
				for (const skillId of part.activatedSkillIds ?? []) {
					if (!anchors.has(skillId)) anchors.set(skillId, part.toolCallId);
				}
			}
		}
		for (const [toolCallId, skillId] of loads) {
			if (!anchors.has(skillId)) anchors.set(skillId, toolCallId);
		}
		return anchors;
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
