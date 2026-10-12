import { computed, inject, provide, type InjectionKey } from 'vue';

export interface AgentEditingContext {
	readonly locked: boolean;
	readonly assistantBuilding: boolean;
	readonly takingOver: boolean;
	takeOver: () => Promise<void>;
}

export const AGENT_EDITING_KEY: InjectionKey<AgentEditingContext> = Symbol('agentEditing');

/** Global dialogs receive the same live context through their modal data. */
export function useAgentEditing(context?: AgentEditingContext) {
	const editing = context ?? inject(AGENT_EDITING_KEY, undefined);
	if (editing) provide(AGENT_EDITING_KEY, editing);

	return {
		editing,
		isEditingLocked: computed(() => editing?.locked ?? false),
	};
}
