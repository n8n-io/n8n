import { inject, type InjectionKey } from 'vue';

export type InstanceAiEditorActionSource =
	| 'canvas_action_button'
	| 'canvas_choice_prompt'
	| 'credential_edit'
	| 'credentials_list'
	| 'node_error_view';

/** The credential type (and optional node) the user wants setup guidance for. */
export interface InstanceAiCredentialContext {
	credentialType: string;
	displayName: string;
	/** Node the credential is being configured for (the editor scenario). */
	nodeName?: string;
	/** Node type the credential is being configured for (the editor scenario). */
	nodeType?: string;
	/** The existing credential's id, when one is already selected (vs. creating a
	 *  new one) — lets the agent act on it directly instead of guessing. */
	id?: string;
	/** n8n docs URL for this credential type, when available in the modal. */
	documentationUrl?: string;
	/** OAuth redirect/callback URL shown in the modal, when this is an OAuth credential. */
	oauthRedirectUrl?: string;
}

/**
 * Opens Instance AI to guide setup of a credential. Handed to the (teleported)
 * credential modal by whichever surface opened it, since the modal can't inject
 * the capability itself. Resolves to whether the credential modal should close:
 * `false` keeps it open (a new-tab hand-off, so the user stays on the form),
 * `true` closes it (an in-thread append, to reveal the conversation).
 */
export type InstanceAiCredentialHelpHandler = (
	credential: InstanceAiCredentialContext,
) => Promise<boolean>;

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
	/**
	 * Open Instance AI for guidance setting up a credential. Resolves to whether
	 * the originating credential modal should close (false = keep open for a
	 * new-tab hand-off, true = close for an in-thread append).
	 */
	openCredential?(
		credential: InstanceAiCredentialContext,
		source: InstanceAiEditorActionSource,
	): Promise<boolean>;
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
