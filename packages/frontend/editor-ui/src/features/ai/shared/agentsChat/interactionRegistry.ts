import type { Component } from 'vue';

import type { AgentsChatInteraction } from './types';

export interface AgentsChatInteractionContext {
	projectId?: string;
	agentId?: string;
	[key: string]: unknown;
}

export interface AgentsChatInteractionRenderer {
	key: string;
	component: Component;
	matches(payload: AgentsChatInteraction, context?: AgentsChatInteractionContext): boolean;
	getProps?: (
		payload: AgentsChatInteraction,
		context?: AgentsChatInteractionContext,
	) => Record<string, unknown>;
}

export function findInteractionRenderer(
	payload: AgentsChatInteraction,
	renderers: AgentsChatInteractionRenderer[],
	context?: AgentsChatInteractionContext,
): AgentsChatInteractionRenderer | undefined {
	return renderers.find((renderer) => renderer.matches(payload, context));
}
