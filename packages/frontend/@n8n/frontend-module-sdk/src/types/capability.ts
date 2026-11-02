import type { SelfHealingResultDetail } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import type { ComputedRef } from 'vue';

/**
 * A typed key for a capability. `declareCapability()` is the only way to make
 * one, and the token is the only way to read or write its slot in the registry.
 */
export interface CapabilityToken<T> {
	/** Labels the capability in registry warnings and errors. */
	readonly key: string;
	/** Returned by `use()` when nothing is provided. Absent means `use()` throws. */
	readonly fallback?: T;
}

/**
 * Structurally identical to `ModalOpeners` in `@n8n/stores`; declared here so a
 * module needs no `@n8n/stores` import.
 *
 * Method syntax keeps the parameters bivariant, so the shell can provide openers
 * typed with the narrower `ModalKey` union without a cast.
 */
export interface ModalOpeners {
	openModal(name: string): void;
	openModalWithData(payload: { name: string; data: Record<string, unknown> }): void;
}

export interface ProjectPermissions {
	/** The user's global scopes plus their scopes in the project. Reads reactive state, so call it in a `computed`. */
	scopesFor(projectId: string): Scope[];
	/** Whether the instance blocks writes (source control read-only branch). Reads reactive state. */
	isReadOnly(): boolean;
}

export interface McpExposeAllOffer {
	/** Whether the experiment is on for this user. Reads reactive state, so call it in a `computed`. */
	isEnabled(): boolean;
	/**
	 * Opens the expose-all modal when there is something to expose. Resolves `true`
	 * when the modal opened. `onExposed` runs after the user exposes everything.
	 */
	offer(onExposed: () => Promise<void> | void): Promise<boolean>;
}

export type SelfHealingChatInput = Pick<
	SelfHealingResultDetail,
	'resultId' | 'workflowId' | 'report' | 'outcome' | 'reviewState' | 'execution'
>;

/**
 * `started` means the chat opened and the report is on its way, so do not start it again.
 * `busy` and `failed` mean no chat started, so the caller can offer another try.
 */
export type SelfHealingChatStartOutcome = 'started' | 'busy' | 'failed' | 'unavailable';

export interface SelfHealingChatHandoff {
	available: ComputedRef<boolean>;
	/** Whether the Assistant is ready and the user can read the project. Reads reactive state, so call it in a `computed`. */
	canStart(projectId: string): boolean;
	/** Opens a chat in the project and sends the report through the normal Assistant handoff. */
	start(projectId: string, input: SelfHealingChatInput): Promise<SelfHealingChatStartOutcome>;
}
