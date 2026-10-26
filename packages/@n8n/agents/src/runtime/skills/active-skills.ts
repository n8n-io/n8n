import type { ModelMessage, ToolResultPart } from 'ai';

import { isRuntimeSkillUpdate } from '../../sdk/message';
import { findReferenceByPath, formatActiveSkill } from '../../skills/tools';
import {
	SKILL_LOAD_TOOL_NAME,
	type RuntimeSkillContent,
	type RuntimeSkillSource,
	type RuntimeSkillStateScope,
	type RuntimeSkillStateStore,
} from '../../skills/types';
import type { AgentPersistenceOptions } from '../../types/sdk/agent';
import type { CustomAgentMessage } from '../../types/sdk/message';
import type { AgentMessageList } from '../model/message-list';

/**
 * Keeps trusted skill instructions available without invalidating the cached
 * prompt prefix.
 *
 * By default, a skill body rides on the tool result that activated it (the recorded result
 * is collapsed first, so an obsolete persisted body is never replayed). The
 * top-level system prompt does not mention the skill, so activating and
 * carrying a skill never rewrites the cached prefix — within a run or across
 * runs.
 *
 * The `<active_skills>` block of the system prompt is a recovery path only.
 * Anthropic renders the prompt as `tools → system → messages`, so any edit to
 * `system` invalidates the tool block and every message after it. The block
 * therefore holds only the skills the anchored path cannot deliver on this
 * call — their result masked by observation memory, their activating call
 * failed, or the activation predates this window with no `load_skill` record:
 *
 * - Anchor still deliverable: the skill rides on its resolved tool result, so
 *   `system` is unchanged and the cached prefix stays warm.
 * - Anchor gone or unusable: the skill moves into the block so its guidance is
 *   never lost. When observation memory replaced the history it already rewrote
 *   the prefix, so the move is free; otherwise it costs one rewrite, the price
 *   of not dropping an active skill.
 *
 * Sources can opt into explicit updates. Those skills keep their original tool
 * results and receive new instructions in persisted messages after the user turn.
 */
export class ActiveSkills {
	private readonly loaded = new Map<string, RuntimeSkillContent>();
	private previousVersions: Record<string, string | null> = {};
	private list?: AgentMessageList;
	private scope?: RuntimeSkillStateScope;
	private pendingSave = Promise.resolve();
	private pendingUpdates: CustomAgentMessage[] = [];

	constructor(
		private readonly source: RuntimeSkillSource,
		private readonly agentName: string,
		private readonly store?: RuntimeSkillStateStore,
	) {}

	async restore(list: AgentMessageList, persistence?: AgentPersistenceOptions): Promise<void> {
		this.loaded.clear();
		this.pendingUpdates = [];
		this.list = list;
		this.scope = persistence
			? {
					threadId: persistence.threadId,
					resourceId: persistence.resourceId,
					agentName: this.agentName,
				}
			: undefined;
		const stored = this.scope ? await this.store?.load(this.scope) : undefined;
		const ids = list.activeSkillIds ??
			stored?.skillIds ?? [
				...this.recordedLoads(list).values(),
				...this.stampedActivations(list).map(([, skillId]) => skillId),
			];
		this.previousVersions = { ...stored?.versions, ...list.activeSkillVersions };
		// A checkpoint can predate a confirmed revocation in thread storage.
		for (const [id, version] of Object.entries(stored?.versions ?? {})) {
			if (version === null) this.previousVersions[id] = null;
		}
		const versions = { ...this.previousVersions };
		const registered = new Set(this.source.registry.skills.map(({ id }) => id));
		const retainedIds = new Set<string>();
		for (const id of new Set(ids)) {
			if (versions[id] === null) continue;
			const skill = registered.has(id) ? await this.source.loadSkill(id) : null;
			if (skill) this.loaded.set(id, skill);
			if (skill || this.source.getLoadError?.(id)?.retryable) retainedIds.add(id);
			const entry = this.source.registry.skills.find((candidate) => candidate.id === id);
			if (this.source.shouldAppendSkillUpdates?.(id) || Object.hasOwn(versions, id)) {
				if (skill && entry) versions[id] = entry.hash;
				else if (!this.source.getLoadError?.(id)?.retryable) versions[id] = null;
			}
		}
		list.activeSkillIds = [...retainedIds];
		if (Object.keys(versions).length > 0) list.activeSkillVersions = versions;
		const storeIsCurrent =
			stored !== undefined &&
			new Set(stored.skillIds).size === retainedIds.size &&
			stored.skillIds.every((id) => retainedIds.has(id)) &&
			Object.keys(stored.versions ?? {}).length === Object.keys(versions).length &&
			Object.entries(versions).every(([id, version]) => stored.versions?.[id] === version);
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
			this.list.activeSkillIds = [...new Set([...(this.list.activeSkillIds ?? []), skillId])];
			const entry = this.source.registry.skills.find((candidate) => candidate.id === skillId);
			const version =
				entry && this.source.shouldAppendSkillUpdates?.(skillId) ? entry.hash : undefined;
			if (version !== undefined) {
				this.list.activeSkillVersions = { ...this.list.activeSkillVersions, [skillId]: version };
			}
			// Stamp the activating tool result so the body re-anchors there on a
			// later turn instead of falling back into the system prompt.
			if (anchor) this.list.stampActivatedSkill(anchor.toolCallId, skillId, version);
			await this.persist();
		}
		return skill;
	}

	/** Stream each new notice once. The message list owns its persisted copy. */
	takeUpdates(): CustomAgentMessage[] {
		const updates = this.pendingUpdates;
		this.pendingUpdates = [];
		return updates;
	}

	/**
	 * The active skills the anchored path cannot deliver on this call, as one
	 * block for the top-level system prompt. A skill enters the block only when
	 * it has no successfully resolved, visible tool result to ride on, so a
	 * still-anchored skill never edits `system` or breaks a warm cache.
	 */
	instructions(): string | undefined {
		this.appendUpdates();
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
					if (skillId && this.usesAppendUpdates(skillId)) return part;
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
	 * An anchor must be a **successfully resolved** tool result: the skill body
	 * is appended to it (see `appendToolResultText`, which skips error outputs),
	 * so a pending, canceled, or failed call cannot deliver it. A skill with no
	 * such anchor — its result masked by observation memory, or its activating
	 * call failed, or the activation predates this window with no `load_skill`
	 * record — falls back to the `<active_skills>` block, which never drops it.
	 * The block only edits `system` when the anchored path cannot deliver, so an
	 * unchanged, still-anchored skill never rewrites the cached prefix.
	 */
	private placement(loads?: Map<string, string>): {
		anchors: Map<string, string>;
		inBlock: string[];
	} {
		const anchors = new Map<string, string>();
		if (this.list) {
			const deliverable = this.deliverableToolResults();
			// `load_skill` results and tool results that stamped a programmatic
			// activation are both valid anchors; the stamp is what survives a turn.
			const sources: Array<[string, string]> = [
				...(loads ?? this.recordedLoads(this.list)),
				...this.stampedActivations(this.list),
			];
			for (const [toolCallId, skillId] of sources) {
				if (
					!this.usesAppendUpdates(skillId) &&
					!anchors.has(skillId) &&
					this.loaded.has(skillId) &&
					deliverable.has(toolCallId)
				) {
					anchors.set(skillId, toolCallId);
				}
			}
		}
		const inBlock = [...this.loaded.keys()].filter(
			(id) => !this.usesAppendUpdates(id) && !anchors.has(id),
		);
		return { anchors, inBlock };
	}

	/**
	 * `[toolCallId, skillId]` pairs for tool results that stamped a programmatic
	 * skill activation (see `stampActivatedSkill`). Unlike `load_skill` records,
	 * these carry activations a tool started itself, so a post-build skill
	 * re-anchors to its tool result on the next turn instead of the system block.
	 */
	private stampedActivations(list: AgentMessageList): Array<[string, string]> {
		const pairs: Array<[string, string]> = [];
		for (const message of list.messages()) {
			if (!('content' in message)) continue;
			for (const part of message.content) {
				if (part.type === 'tool-call' && Array.isArray(part.activatedSkillIds)) {
					for (const skillId of part.activatedSkillIds) pairs.push([part.toolCallId, skillId]);
				}
			}
		}
		return pairs;
	}

	/**
	 * Tool-call ids whose result is visible and successfully resolved, so a skill
	 * body can ride on it. Pending, canceled, and failed calls are excluded — a
	 * skill anchored there would silently vanish, so it belongs in the block.
	 */
	private deliverableToolResults(): Set<string> {
		const ids = new Set<string>();
		if (!this.list) return ids;
		for (const message of this.list.llmVisibleMessages()) {
			if (!('content' in message)) continue;
			for (const part of message.content) {
				if (part.type === 'tool-call' && part.state === 'resolved' && !part.canceled) {
					ids.add(part.toolCallId);
				}
			}
		}
		return ids;
	}

	private formatSkill(skillId: string): string | undefined {
		const skill = this.loaded.get(skillId);
		const entry = this.source.registry.skills.find((candidate) => candidate.id === skillId);
		return skill && entry ? formatActiveSkill(skill, entry, this.source.registry) : undefined;
	}

	private usesAppendUpdates(skillId: string): boolean {
		return Object.hasOwn(this.list?.activeSkillVersions ?? {}, skillId);
	}

	/** Recover current instructions after compaction without changing an earlier message. */
	private appendUpdates(): void {
		const list = this.list;
		if (!list?.activeSkillVersions) return;
		const visibleVersions = new Map<string, string | null>();
		for (const message of list.llmVisibleMessages()) {
			if (message.type === 'custom') {
				if (isRuntimeSkillUpdate(message)) {
					const { skillId, version } = message.data.skillUpdate;
					visibleVersions.set(skillId, version);
				}
				continue;
			}
			for (const part of message.content) {
				if (
					part.type !== 'tool-call' ||
					part.toolName !== SKILL_LOAD_TOOL_NAME ||
					part.state !== 'resolved' ||
					part.canceled
				)
					continue;
				for (const [id, version] of Object.entries(part.activatedSkillVersions ?? {})) {
					visibleVersions.set(id, version);
				}
			}
		}
		for (const [skillId, savedVersion] of Object.entries(list.activeSkillVersions)) {
			const version = this.loaded.has(skillId) ? savedVersion : null;
			if (visibleVersions.has(skillId) && visibleVersions.get(skillId) === version) continue;
			const body = this.formatSkill(skillId);
			const changed =
				this.previousVersions[skillId] !== undefined && this.previousVersions[skillId] !== version;
			const content = body
				? `Skill ${JSON.stringify(skillId)} ${changed ? 'was updated' : 'is active'}. Use these current instructions when relevant. They replace earlier instructions and reference content for this skill.\n\n${body}`
				: `Skill ${JSON.stringify(skillId)} is unavailable. Do not use its earlier instructions or reference content. Load it again if it becomes available and is needed.`;
			const update: CustomAgentMessage = {
				type: 'custom',
				data: {
					type: 'n8n:runtime-skill-update',
					skillUpdate: {
						skillId,
						version,
						content,
						name: this.source.registry.skills.find((entry) => entry.id === skillId)?.name,
						change: body ? (changed ? 'updated' : 'restored') : 'unavailable',
					},
				},
			};
			list.addInput([update]);
			this.pendingUpdates.push(update);
		}
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
				const requested =
					typeof skillId === 'string' ? skillId : typeof name === 'string' ? name : undefined;
				if (!requested) continue;
				const entry = this.source.registry.skills.find(
					(skill) => skill.id === requested || skill.name === requested,
				);
				if (typeof filePath === 'string' && !['', '/', '.', 'SKILL.md'].includes(filePath.trim())) {
					// Only a path to a reference skill is an activation; other linked files are plain reads.
					const reference = entry
						? findReferenceByPath(this.source.registry, entry.id, filePath)
						: undefined;
					if (reference) loads.set(part.toolCallId, reference.id);
					continue;
				}
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
		const versions = this.list?.activeSkillVersions;
		// Concurrent tool calls must not overwrite a newer activation with an older set.
		const state = { skillIds: ids, ...(versions ? { versions: { ...versions } } : {}) };
		const save = this.pendingSave.then(async () => await store.save(scope, state));
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
