import { inject, type InjectionKey } from 'vue';

export type InstanceAiEditorActionSource =
	| 'canvas_action_button'
	| 'canvas_choice_prompt'
	| 'credential_edit'
	| 'credentials_list'
	| 'node_error_view';

/** The credential type (and optional node) the user wants setup guidance for. */
export interface InstanceAiCredentialContext {
	name: string;
	displayName: string;
	/** Node the credential is being configured for (the editor scenario). */
	nodeName?: string;
}

/**
 * Opens Instance AI to guide setup of a credential. Handed to the (teleported)
 * credential modal by whichever surface opened it — an editor's capability or
 * the credentials list — since the modal can't inject the capability itself.
 */
export type InstanceAiCredentialHelpHandler = (
	credential: InstanceAiCredentialContext,
) => Promise<void>;

/**
 * The editor's Instance AI *behavior* extension point (visibility is the separate
 * `instanceAi` `EditorFeature`). Each action is optional — a host provides only the
 * ones meaningful in its environment, and an entry point hides when its action is
 * absent. The editor host provides both; the artifact host provides only
 * `openCredential` (the workflow is already the thread's subject).
 */
export interface InstanceAiEditorCapability {
	/** Open Instance AI about the editor's current workflow. */
	openWorkflow?(source: InstanceAiEditorActionSource): Promise<void>;
	/** Open Instance AI for guidance setting up a credential. */
	openCredential?(
		credential: InstanceAiCredentialContext,
		source: InstanceAiEditorActionSource,
	): Promise<void>;
}

export const InstanceAiEditorCapabilityKey: InjectionKey<InstanceAiEditorCapability> = Symbol(
	'InstanceAiEditorCapability',
);

// Fail-safe: no provider → every entry point hides (a host that forgets gets a
// missing button, never another environment's behavior).
const UNAVAILABLE: InstanceAiEditorCapability = {};

export function useInstanceAiEditorCapability(): InstanceAiEditorCapability {
	return inject(InstanceAiEditorCapabilityKey, UNAVAILABLE);
}
