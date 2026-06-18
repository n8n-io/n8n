import { inject, type InjectionKey } from 'vue';

export type InstanceAiEditorActionSource =
	| 'canvas_action_button'
	| 'canvas_choice_prompt'
	| 'credential_edit'
	| 'credentials_list';

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
 * The editor's Instance AI *behavior* extension point: what invoking an entry
 * point does. Visibility is a separate axis owned by the `instanceAi`
 * `EditorFeature` (see `useEditorContext`) — providers here only define
 * behavior, so the entry-point components never branch on where they are mounted.
 *
 * Each action is optional: a host provides only the actions meaningful in its
 * environment, and an entry point hides when its action is absent (layered on
 * top of the `instanceAi` feature gate). The standalone editor host
 * (`WorkflowLayout`) provides both — open a thread about the current workflow,
 * and credential setup guidance carrying that workflow. The Instance AI artifact
 * host provides only `openCredential` (append guidance to the open thread); it
 * omits `openWorkflow` because the workflow is already the thread's subject.
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

/**
 * Fail-safe resolution: no provider means the hosting environment offers no
 * Instance AI behavior, so every entry point hides. A host that forgets to
 * provide gets a missing button — never another environment's behavior.
 */
const UNAVAILABLE: InstanceAiEditorCapability = {};

export function useInstanceAiEditorCapability(): InstanceAiEditorCapability {
	return inject(InstanceAiEditorCapabilityKey, UNAVAILABLE);
}
