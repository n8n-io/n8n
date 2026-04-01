import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { ModelMessage } from 'ai';

import { toAiMessages } from './messages';
import { stripOrphanedToolMessages } from './strip-orphaned-tool-messages';
import { buildWorkingMemoryInstruction } from './working-memory';
import { filterLlmMessages } from '../sdk/message';
import type { SerializedMessageList } from '../types/runtime/message-list';
import type { AgentDbMessage } from '../types/sdk/message';

export type { SerializedMessageList };

export interface WorkingMemoryContext {
	template: string;
	structured: boolean;
	/** The current persisted state, or null if not yet loaded. Falls back to template. */
	state: string | null;
}

/**
 * Append-only message container with Set-based source tracking.
 *
 * Three named sources:
 *   history   — messages loaded from memory at the start of the turn.
 *               Never included in turnDelta(); already persisted.
 *   input     — the caller's raw input for this turn (custom messages preserved).
 *   response  — LLM replies, tool results, and custom tool messages from this turn.
 *
 * Serialization stores the flat message array plus the IDs of each set so
 * the full three-way source distinction survives a round-trip.
 */
export class AgentMessageList {
	private all: AgentDbMessage[] = [];

	private historySet = new Set<AgentDbMessage>();

	private inputSet = new Set<AgentDbMessage>();

	private responseSet = new Set<AgentDbMessage>();

	/** Working memory context for this run. Set by buildMessageList / resume. */
	workingMemory: WorkingMemoryContext | undefined;

	addHistory(messages: AgentDbMessage[]): void {
		for (const m of messages) {
			this.all.push(m);
			this.historySet.add(m);
		}
	}

	addInput(messages: AgentDbMessage[]): void {
		for (const m of messages) {
			this.all.push(m);
			this.inputSet.add(m);
		}
	}

	addResponse(messages: AgentDbMessage[]): void {
		for (const m of messages) {
			this.all.push(m);
			this.responseSet.add(m);
		}
	}

	/**
	 * Full LLM context for a generateText / streamText call.
	 * Prepends the system prompt (with working memory appended if configured),
	 * strips custom messages via filterLlmMessages.
	 */
	forLlm(baseInstructions: string, instructionProviderOptions?: ProviderOptions): ModelMessage[] {
		let systemPrompt = baseInstructions;

		if (this.workingMemory) {
			const wmInstruction = buildWorkingMemoryInstruction(
				this.workingMemory.template,
				this.workingMemory.structured,
			);
			const wmState = this.workingMemory.state ?? this.workingMemory.template;
			systemPrompt +=
				wmInstruction + '\n\nCurrent working memory state:\n```\n' + wmState + '\n```';
		}

		const systemMessage: ModelMessage = instructionProviderOptions
			? { role: 'system', content: systemPrompt, providerOptions: instructionProviderOptions }
			: { role: 'system', content: systemPrompt };
		return [systemMessage, ...toAiMessages(filterLlmMessages(stripOrphanedToolMessages(this.all)))];
	}

	/**
	 * Current-turn delta for memory persistence (input + responses).
	 * Non-destructive — safe to call multiple times (e.g. on retry).
	 */
	turnDelta(): AgentDbMessage[] {
		return this.all.filter((m) => this.inputSet.has(m) || this.responseSet.has(m));
	}

	/**
	 * Only the LLM-produced messages from this turn (responses + tool results).
	 * Used for GenerateResult.messages — callers should not see their own input echoed back.
	 */
	responseDelta(): AgentDbMessage[] {
		return this.all.filter((m) => this.responseSet.has(m));
	}

	serialize(): SerializedMessageList {
		const toIds = (set: Set<AgentDbMessage>) => Array.from(set).map((m) => m.id);
		return {
			messages: [...this.all],
			historyIds: toIds(this.historySet),
			inputIds: toIds(this.inputSet),
			responseIds: toIds(this.responseSet),
		};
	}

	static deserialize(data: SerializedMessageList): AgentMessageList {
		const list = new AgentMessageList();
		const historyIdSet = new Set(data.historyIds);
		const inputIdSet = new Set(data.inputIds);
		const responseIdSet = new Set(data.responseIds);
		for (const m of data.messages) {
			list.all.push(m);
			if (historyIdSet.has(m.id)) list.historySet.add(m);
			if (inputIdSet.has(m.id)) list.inputSet.add(m);
			if (responseIdSet.has(m.id)) list.responseSet.add(m);
		}
		return list;
	}
}
