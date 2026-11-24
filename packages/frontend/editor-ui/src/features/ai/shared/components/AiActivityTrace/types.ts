import type { IconName } from '@n8n/design-system';
import type { Component } from 'vue';

/** One block of streamed reasoning or narration. */
export interface AiThinkingSegment {
	id?: string;
	content: string;
}

/** The thinking section of a run. Its label reads the latest sentence and the elapsed time. */
export interface AiActivityThinkingItem {
	kind: 'thinking';
	id: string;
	segments: AiThinkingSegment[];
	active: boolean;
	awaitingInput?: boolean;
	/** Persisted duration. The label uses the longer of this and the observed time. */
	durationSec?: number;
	/** Replaces the latest sentence while active. */
	activityLabel?: string;
	/** Replaces the generic "Thinking" while active. */
	idleLabel?: string;
	/** Replaces "Thought for Ns" when done. */
	settledLabel?: string;
	testId?: string;
}

/** A view that replaces the default output view of a tool call. */
export interface AiActivityOutputView {
	component: Component;
	props: Record<string, unknown>;
}

/** One tool call. The trace renders its body from these fields. */
export interface AiActivityToolItem<TTool = unknown> {
	kind: 'tool';
	id: string;
	label: string;
	/** Selects the code and table views of the output. */
	toolName: string;
	loading?: boolean;
	/** The call waits for something outside the run. It does not make its group shimmer. */
	waiting?: boolean;
	error?: string;
	errorIcon?: IconName;
	hideErrorCallout?: boolean;
	/** The feature renders the error callout through the `tool-error-callout` slot. */
	customErrorCallout?: boolean;
	/** Markdown that shows first in the body, such as the answer of a delegated agent. */
	details?: string;
	/** Tool input. `undefined` hides the input view. */
	input?: unknown;
	/** Tool output. `undefined` hides the output view. */
	output?: unknown;
	/** Replaces the default output view. */
	outputView?: AiActivityOutputView;
	/** Steps of a delegated agent. They render as a nested trace. */
	children?: Array<AiActivityItem<TTool>>;
	/** Defaults to true when the body has something to show. */
	hasContent?: boolean;
	/** The source object of the feature, for its slots. */
	payload: TTool;
}

/** A labelled step that is not a tool call, such as a notice. */
export interface AiActivityStepItem {
	kind: 'step';
	id: string;
	label: string;
	/** Plain text body. Without it, the step does not expand. */
	description?: string;
	loading?: boolean;
	error?: string;
	testId?: string;
}

export type AiActivityItem<TTool = unknown> =
	| AiActivityThinkingItem
	| AiActivityToolItem<TTool>
	| AiActivityStepItem;

/** Adjacent tool calls, made by `groupActivityItems`. */
export interface AiActivityToolGroupItem<TTool = unknown> {
	kind: 'tools';
	id: string;
	items: Array<AiActivityToolItem<TTool>>;
}

export type AiActivityRenderItem<TTool = unknown> =
	| AiActivityItem<TTool>
	| AiActivityToolGroupItem<TTool>;
