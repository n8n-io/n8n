import type { ModelMessage, ToolResultPart } from 'ai';

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

/**
 * Keeps trusted skill instructions available without invalidating the cached
 * prompt prefix.
 *
 * A skill body rides on the tool result that activated it (the recorded result
 * is collapsed first, so an obsolete persisted body is never replayed). The
 * top-level system prompt does not mention the skill, so activating and
 * carrying a skill never rewrites the cached prefix — within a run or across
 * runs.
 *
 * The `<active_skills>` block of the system prompt is a recovery path only.
 * Anthropic renders the prompt as `tools → system → messages`, so any edit to
 * `system` invalidates the tool block and every message after it. The block is
 * therefore populated only when observational memory already replaced the
 * history for this run — an in-run mask, or a fresh turn whose history loaded
 * only after the persisted cursor. That is the one moment the move costs no
 * extra cache invalidation:
 *
 * - No observation memory on this run: the block stays empty. Every active
 *   skill rides on its still-visible activating tool result.
 * - Observation replaced the history: skills whose activating tool result is now
 *   hidden (activated at or before the observation cursor) move into the block.
 *   Skills activated after the cursor keep their still-visible anchor.
 */
export class ActiveSkills {
	private readonly loaded = new Map<string, RuntimeSkillContent>();
	/** skillId → toolCallId for activations this run without a recorded `load_skill` call. */
	private readonly midRunAnchors = new Map<string, string>();
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
		this.midRunAnchors.clear();
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
			// The first activating call carries the skill text in its result. A
			// repeat load must not move it and rewrite the cached prompt behind it.
			if (anchor) this.midRunAnchors.set(skillId, anchor.toolCallId);
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
	 * The active skills whose delivering tool result is no longer visible, as
	 * one block for the top-level system prompt. A skill enters this block only
	 * after observational memory masked its anchor — the moment the prefix was
	 * rewritten anyway — so the block itself never breaks a warm cache.
	 */
	instructions(): string | undefined {
		const { inBlock } = this.placement();
		const sections = inBlock.flatMap((id) => {
			const text = this.formatSkill(id);
			return text ? [text] : [];
		});
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
	 * Collapses recorded `load_skill` results to `{ skillId, active }`: old
	 * conversations can contain full skill bodies, and an obsolete version must
	 * not be replayed. Skills anchored to a visible tool call then get their
	 * current body appended to that result, keeping them out of the system
	 * block for as long as observational memory keeps the result visible.
	 */
	modelMessages(messages: ModelMessage[], list: AgentMessageList): ModelMessage[] {
		const loads = this.recordedLoads(list);
		const { anchors } = this.placement(loads);
		const appendices = new Map<string, string[]>();
		for (const [skillId, toolCallId] of anchors) {
			const text = this.formatSkill(skillId);
			if (text) appendices.set(toolCallId, [...(appendices.get(toolCallId) ?? []), text]);
		}
		return messages.map((message) => {
			if (message.role !== 'tool') return message;
			return {
				...message,
				content: message.content.map((part) => {
					if (part.type !== 'tool-result') return part;
					const skillId = loads.get(part.toolCallId);
					const collapsed: ToolResultPart = skillId
						? {
								...part,
								output: {
									type: 'json' as const,
									value: { skillId, active: this.loaded.has(skillId) },
								},
							}
						: part;
					const texts = appendices.get(part.toolCallId);
					return texts ? appendToolResultText(collapsed, texts) : collapsed;
				}),
			};
		});
	}

	/**
	 * Where each active skill is delivered on this call: anchored to a visible
	 * tool result, or in the system block. The anchor is the first visible
	 * recorded `load_skill` call for the skill, else this run's activating
	 * call. `instructions()` and `modelMessages()` share this so a skill is
	 * always delivered exactly once.
	 *
	 * The system block is a recovery path used only after observational memory
	 * masked the window on this run. Without a mask the block stays empty, so a
	 * skill without a visible anchor is simply not re-delivered — the move into
	 * `system` would rewrite the whole cached prefix for no read.
	 */
	private placement(loads?: Map<string, string>): {
		anchors: Map<string, string>;
		inBlock: string[];
	} {
		const anchors = new Map<string, string>();
		if (this.list) {
			const visible = new Set<string>();
			for (const message of this.list.llmVisibleMessages()) {
				if (!('content' in message)) continue;
				for (const part of message.content) {
					if (part.type === 'tool-call') visible.add(part.toolCallId);
				}
			}
			for (const [toolCallId, skillId] of loads ?? this.recordedLoads(this.list)) {
				if (!anchors.has(skillId) && this.loaded.has(skillId) && visible.has(toolCallId)) {
					anchors.set(skillId, toolCallId);
				}
			}
			for (const [skillId, toolCallId] of this.midRunAnchors) {
				if (!anchors.has(skillId) && this.loaded.has(skillId) && visible.has(toolCallId)) {
					anchors.set(skillId, toolCallId);
				}
			}
		}
		// Only recover skills into `system` when observation already replaced the
		// history this run. Otherwise the block would break a warm cache for a
		// change the model can already read from the anchored tool result.
		const inBlock =
			(this.list?.hasObservationMemory() ?? false)
				? [...this.loaded.keys()].filter((id) => !anchors.has(id))
				: [];
		return { anchors, inBlock };
	}

	private formatSkill(skillId: string): string | undefined {
		const skill = this.loaded.get(skillId);
		const entry = this.source.registry.skills.find((candidate) => candidate.id === skillId);
		return skill && entry ? formatActiveSkill(skill, entry) : undefined;
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

/**
 * Append trusted text parts after a tool result's own output. Text and JSON
 * outputs become content parts so the skill text is a separate block from the
 * (possibly untrusted-wrapped) tool output. Error outputs are left alone.
 */
function appendToolResultText(part: ToolResultPart, texts: string[]): ToolResultPart {
	const extra = texts.map((text) => ({ type: 'text' as const, text }));
	const { output } = part;
	switch (output.type) {
		case 'content':
			return { ...part, output: { type: 'content', value: [...output.value, ...extra] } };
		case 'text':
			return {
				...part,
				output: { type: 'content', value: [{ type: 'text', text: output.value }, ...extra] },
			};
		case 'json':
			return {
				...part,
				output: {
					type: 'content',
					value: [{ type: 'text', text: JSON.stringify(output.value) }, ...extra],
				},
			};
		default:
			return part;
	}
}
