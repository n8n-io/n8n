import { computed, inject, type ComputedRef, type InjectionKey } from 'vue';

export type InstanceAiEditorActionSource =
	| 'floating_button'
	| 'canvas_action_button'
	| 'canvas_choice_prompt';

/**
 * The editor's Instance AI extension point: whether its AI entry points show,
 * and what invoking them does. Both axes belong to the environment hosting the
 * editor, so hosts provide the whole capability via `InstanceAiEditorCapabilityKey`
 * and the entry-point components never branch on where they are mounted.
 *
 * The standalone editor host (`WorkflowLayout`) provides the Instance AI
 * hand-off (open a thread about the current workflow). An editor embedded in a
 * host with its own conversation context (e.g. the Instance AI artifact view)
 * provides its own meaning — or nothing, which hides the entry points.
 */
export interface InstanceAiEditorCapability {
	/** Whether Instance AI entry points should render in this editor. */
	isAvailable: ComputedRef<boolean>;
	/** Open Instance AI about the editor's current workflow. */
	openWorkflow(source: InstanceAiEditorActionSource): Promise<void>;
}

export const InstanceAiEditorCapabilityKey: InjectionKey<InstanceAiEditorCapability> = Symbol(
	'InstanceAiEditorCapability',
);

/**
 * Fail-safe resolution: no provider means the hosting environment offers no
 * Instance AI entry, so the entry points hide. A host that forgets to provide
 * gets a missing button — never another environment's behavior.
 */
const UNAVAILABLE: InstanceAiEditorCapability = {
	isAvailable: computed(() => false),
	openWorkflow: async () => {},
};

export function useInstanceAiEditorCapability(): InstanceAiEditorCapability {
	return inject(InstanceAiEditorCapabilityKey, UNAVAILABLE);
}
