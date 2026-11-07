import type { Component, ComputedRef, InjectionKey } from 'vue';

import { HOST_EVENT_PLACEMENT, TOOL_CALL_STATE, type HostEventPlacement } from './constants';
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
	 * `message` that carries it as props. The chat adds no spacing around it.
	 */
	hostEventComponent?: Component;
	/** Where the assistant message shows a matched host event. The default is `start`. */
	hostEventPlacement?: AgentsChatHostEventPlacement;
}

/** Where an assistant message shows a host event. See `HOST_EVENT_PLACEMENT`. */
export type AgentsChatHostEventPlacement = HostEventPlacement;

/** A host event and the assistant message that carries it. */
export interface AgentsChatHostEventSource {
	event: AgentsChatHostEvent;
	message: AgentsChatMessage;
}

/** A host event that the chat renders, with the host component for it. */
export interface AgentsChatHostEventItem extends AgentsChatHostEventSource {
	component: Component;
	placement: AgentsChatHostEventPlacement;
}

/** The host events of one assistant message, by the slot that shows them. */
export interface AgentsChatHostEventItems {
	start: AgentsChatHostEventItem[];
	/** `end` events, then `transient` events. */
	end: AgentsChatHostEventItem[];
	/** `thinking` events, when the message has a thinking block. */
	thinking: AgentsChatHostEventItem[];
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
 * The first host extension that renders `event`, or `undefined` when no
 * extension renders it. The chat shows nothing for an unhandled event.
 */
export function findHostEventRenderer(
	event: AgentsChatHostEvent,
	extensions: readonly AgentsChatInteractionExtension[],
): { component: Component; placement: AgentsChatHostEventPlacement } | undefined {
	const extension = extensions.find((ext) => ext.hostEventComponent && ext.matchHostEvent?.(event));
	if (!extension?.hostEventComponent) return undefined;
	return {
		component: extension.hostEventComponent,
		placement: extension.hostEventPlacement ?? HOST_EVENT_PLACEMENT.START,
	};
}

/**
 * A string that stays the same when a host event updates. Keyed events use
 * `name` and `key`, because an update in a later message gets a new `id`.
 * Events without a key never update, so they use `id`.
 */
export function hostEventIdentity(event: AgentsChatHostEvent): string {
	return event.key === undefined
		? JSON.stringify(['id', event.id])
		: JSON.stringify(['key', event.name, event.key]);
}

/**
 * Appends the host events of `message` to `existing`. An event with the same
 * identity replaces the earlier event in place: a keyed re-emit, or a turn
 * that history stores twice (on suspend and on completion).
 */
export function appendHostEventSources(
	existing: readonly AgentsChatHostEventSource[],
	message: AgentsChatMessage,
): AgentsChatHostEventSource[] {
	const merged = [...existing];
	const indexByIdentity = new Map(
		merged.map((source, index) => [hostEventIdentity(source.event), index]),
	);
	for (const event of message.hostEvents ?? []) {
		const identity = hostEventIdentity(event);
		const index = indexByIdentity.get(identity);
		if (index === undefined) {
			indexByIdentity.set(identity, merged.length);
			merged.push({ event, message });
		} else {
			merged[index] = { event, message };
		}
	}
	return merged;
}

/**
 * Sorts host events into the slots of an assistant message, in arrival order.
 * `transient` events are kept only when `options.showTransient` is true.
 * `thinking` events go to `start` when the message has no thinking block, so
 * they still show. Unhandled events are dropped.
 */
export function getHostEventItems(
	sources: readonly AgentsChatHostEventSource[],
	extensions: readonly AgentsChatInteractionExtension[],
	options: { showTransient: boolean; hasThinkingBlock: boolean },
): AgentsChatHostEventItems {
	const items: Record<AgentsChatHostEventPlacement, AgentsChatHostEventItem[]> = {
		start: [],
		end: [],
		transient: [],
		thinking: [],
	};
	for (const source of sources) {
		const renderer = findHostEventRenderer(source.event, extensions);
		if (!renderer) continue;
		const placement =
			renderer.placement === HOST_EVENT_PLACEMENT.THINKING && !options.hasThinkingBlock
				? HOST_EVENT_PLACEMENT.START
				: renderer.placement;
		items[placement].push({ ...source, ...renderer, placement });
	}
	return {
		start: items.start,
		end: options.showTransient ? [...items.end, ...items.transient] : items.end,
		thinking: items.thinking,
	};
}
