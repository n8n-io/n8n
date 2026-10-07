import type { Component, ComputedRef, InjectionKey } from 'vue';

import type { AgentsChatInteraction, ToolCall } from './types';

export interface AgentsChatInteractionRenderer {
	key: string;
	component: Component;
	matches(payload: AgentsChatInteraction): boolean;
	getProps?: (payload: AgentsChatInteraction) => Record<string, unknown>;
}

/**
 * A card type that the host of an Agents chat provides, for tool suspensions
 * that only its agent produces (for example the n8n Assistant confirmations).
 * Only the chat that receives the extension maps and renders these cards.
 */
export interface AgentsChatInteractionExtension<TInput = unknown> {
	/** Unique key. It is stored on the payload as `extensionKey`. */
	key: string;
	/** The card input for a tool call, or `undefined` when the call is not this card. */
	parse(toolCall: ToolCall): TInput | undefined;
	/** The card. It gets the props from `getProps` and emits `submit(resumeData)`. */
	component: Component;
	/** Defaults to `{ input }`. */
	getProps?: (input: TInput) => Record<string, unknown>;
}

/** The extensions of the chat panel, for the interactive cards it renders. */
export const AGENTS_CHAT_INTERACTION_EXTENSIONS: InjectionKey<
	ComputedRef<readonly AgentsChatInteractionExtension[]>
> = Symbol('agentsChatInteractionExtensions');

export function findInteractionRenderer(
	payload: AgentsChatInteraction,
	renderers: AgentsChatInteractionRenderer[],
): AgentsChatInteractionRenderer | undefined {
	return renderers.find((renderer) => renderer.matches(payload));
}
