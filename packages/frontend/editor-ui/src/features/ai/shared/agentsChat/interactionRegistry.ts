import type { Component, ComputedRef, InjectionKey } from 'vue';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from './constants';
import type {
	AgentsChatHostEvent,
	AgentsChatInteraction,
	AgentsChatMessage,
	ToolCall,
} from './types';

export interface AgentsChatInteractionRenderer {
	key: string;
	component: Component;
	matches(payload: AgentsChatInteraction): boolean;
	getProps?: (payload: AgentsChatInteraction) => Record<string, unknown>;
}

/**
 * A card type that the host of an Agents chat provides, for tool suspensions
 * that only its agent produces. Only the chat that receives the extension maps
 * and renders these cards, so other agents never show them.
 *
 * The card fields (`parse` and `component`) are optional, so a host can add
 * other parts without a card. The chat maps a card only with `parse`, and
 * renders it only with `component`. Set both for a card.
 *
 * An extension can also render the result of a finished tool call
 * (`matchToolResult` and `resultComponent`). The chat then shows the host
 * component in place of the default tool step. An extension that only renders
 * results needs no card fields.
 *
 * An extension can also render host events (`matchHostEvent`,
 * `hostEventComponent` and `hostEventPlacement`). The placement sets where the
 * assistant message shows the event. See `AgentsChatHostEventPlacement`.
 */
export interface AgentsChatInteractionExtension<TInput = unknown> {
	/** Unique key. The payload stores it as `extensionKey`. */
	key: string;
	/** The card input for a tool call, or `undefined` when the call is not this card. */
	parse?(toolCall: ToolCall): TInput | undefined;
	/** The card. It gets the props from `getProps` and emits `submit(resumeData)`. */
	component?: Component;
	/**
	 * Props for the card. Defaults to `{ input }`. Declared as a method so that a
	 * typed extension fits in an `AgentsChatInteractionExtension[]` list.
	 */
	getProps?(input: TInput): Record<string, unknown>;
	/**
	 * Resume data for an open card of this type, from the composer text. For
	 * example, a review card where typed text means "request changes" returns
	 * `{ approved: false, feedback: text }`. Return `undefined` to keep the
	 * default: the chat cancels the card and steers the run with the text.
	 */
	composerResumeData?(input: TInput, text: string): unknown;
	/**
	 * True when the host renders the result of this tool call. The chat asks
	 * only for calls that finished with an output, without an error or a cancel.
	 */
	matchToolResult?(toolCall: ToolCall): boolean;
	/**
	 * Renders a matched tool result. It gets the finished call as the `toolCall`
	 * prop. When this extension also renders a card for the tool, `output` is
	 * the resume data until the tool result arrives.
	 */
	resultComponent?: Component;
	/** True when this extension handles the host event. Usually a check on `event.name`. */
	matchHostEvent?(event: AgentsChatHostEvent): boolean;
	/**
	 * Renders a matched host event. It gets the `event` and the assistant
	 * `message` that carries it as props. Not necessary for placement `none`.
	 */
	hostEventComponent?: Component;
	/** Where the assistant message shows a matched host event. The default is `start`. */
	hostEventPlacement?: AgentsChatHostEventPlacement;
}

/**
 * Where an assistant message shows a host event:
 * - `start`: above the text and tool steps of the message, in arrival order.
 * - `end`: below the text and tool steps of the message, in arrival order.
 * - `transient`: below the message, only while the message has no text.
 * - `none`: not shown. The event stays on `message.hostEvents` for other host UI.
 */
export type AgentsChatHostEventPlacement = 'start' | 'end' | 'transient' | 'none';

export const DEFAULT_HOST_EVENT_PLACEMENT: AgentsChatHostEventPlacement = 'start';

/** The host extension that handles one host event. */
export type AgentsChatHostEventRenderer =
	| { key: string; placement: 'none' }
	| { key: string; placement: Exclude<AgentsChatHostEventPlacement, 'none'>; component: Component };

/** A host event and the assistant message that carries it. */
export interface AgentsChatHostEventSource {
	event: AgentsChatHostEvent;
	message: AgentsChatMessage;
}

/** A host event that the chat renders, with the host component for it. */
export interface AgentsChatHostEventItem extends AgentsChatHostEventSource {
	component: Component;
}

export interface AgentsChatHostEventItems {
	start: AgentsChatHostEventItem[];
	end: AgentsChatHostEventItem[];
	transient: AgentsChatHostEventItem[];
}

/** A host component that renders the result of one finished tool call. */
export interface AgentsChatToolResultRenderer {
	key: string;
	component: Component;
}

/** The extensions of the chat panel, for the interactive cards that it renders. */
export const AGENTS_CHAT_INTERACTION_EXTENSIONS: InjectionKey<
	ComputedRef<readonly AgentsChatInteractionExtension[]>
> = Symbol('agentsChatInteractionExtensions');

export function findInteractionRenderer(
	payload: AgentsChatInteraction,
	renderers: AgentsChatInteractionRenderer[],
): AgentsChatInteractionRenderer | undefined {
	return renderers.find((renderer) => renderer.matches(payload));
}

/**
 * `tool-execution-end` and the stream finalizer set `DONE` before the output
 * arrives, so a call without output is not finished yet.
 */
function isFinishedToolCall(toolCall: ToolCall): boolean {
	return (
		toolCall.state === TOOL_CALL_STATE.DONE &&
		toolCall.canceled !== true &&
		toolCall.output !== undefined
	);
}

/**
 * The first host extension that renders the result of `toolCall`, or
 * `undefined` when the chat shows the default tool step. Calls that run, wait
 * for the user, fail, were canceled or have no output yet always use the
 * default tool step.
 */
export function findToolResultRenderer(
	toolCall: ToolCall,
	extensions: readonly AgentsChatInteractionExtension[],
): AgentsChatToolResultRenderer | undefined {
	if (!isFinishedToolCall(toolCall)) return undefined;
	for (const extension of extensions) {
		if (!extension.resultComponent || !extension.matchToolResult?.(toolCall)) continue;
		return { key: extension.key, component: extension.resultComponent };
	}
	return undefined;
}

/**
 * The first host extension that handles `event`, or `undefined` when no
 * extension handles it. The chat renders nothing for an unhandled event. An
 * extension with a visible placement but no component does not handle events.
 */
export function findHostEventRenderer(
	event: AgentsChatHostEvent,
	extensions: readonly AgentsChatInteractionExtension[],
): AgentsChatHostEventRenderer | undefined {
	for (const extension of extensions) {
		if (!extension.matchHostEvent?.(event)) continue;
		const placement = extension.hostEventPlacement ?? DEFAULT_HOST_EVENT_PLACEMENT;
		if (placement === 'none') return { key: extension.key, placement };
		if (!extension.hostEventComponent) continue;
		return { key: extension.key, placement, component: extension.hostEventComponent };
	}
	return undefined;
}

/**
 * Sorts host events into the slots of an assistant message, in arrival order.
 * `transient` events are kept only while the message has no text
 * (`hasText`). Events with placement `none` and unhandled events are dropped.
 */
export function getHostEventItems(
	sources: readonly AgentsChatHostEventSource[],
	extensions: readonly AgentsChatInteractionExtension[],
	{ hasText }: { hasText: boolean },
): AgentsChatHostEventItems {
	const items: AgentsChatHostEventItems = { start: [], end: [], transient: [] };
	if (extensions.length === 0) return items;
	for (const source of sources) {
		const renderer = findHostEventRenderer(source.event, extensions);
		if (!renderer || renderer.placement === 'none') continue;
		if (renderer.placement === 'transient' && hasText) continue;
		items[renderer.placement].push({ ...source, component: renderer.component });
	}
	return items;
}

/** True when `message` has nothing to show except its host events. */
export function isHostEventOnlyMessage(message: AgentsChatMessage): boolean {
	return (
		message.role === 'assistant' &&
		!!message.hostEvents?.length &&
		!message.content.trim() &&
		!message.renderParts?.length &&
		!message.toolCalls?.length &&
		!message.thinkingSegments?.length &&
		!message.thinking &&
		!message.interactive &&
		!message.interactives?.length &&
		!message.attachments?.length &&
		!message.budgetNotices?.length &&
		!message.backgroundJobSignal
	);
}

/**
 * True when the chat hides `message`: it has only host events and no host
 * extension renders any of them. A streaming message stays, so the typing
 * indicator still shows. Messages without host events are never hidden.
 */
export function isHiddenHostEventOnlyMessage(
	message: AgentsChatMessage,
	extensions: readonly AgentsChatInteractionExtension[],
): boolean {
	if (!isHostEventOnlyMessage(message) || message.status === CHAT_MESSAGE_STATUS.STREAMING)
		return false;
	const items = getHostEventItems(
		(message.hostEvents ?? []).map((event) => ({ event, message })),
		extensions,
		{ hasText: false },
	);
	return items.start.length + items.end.length + items.transient.length === 0;
}
