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

export interface McpExposeAllOffer {
	/** Whether the experiment is on for this user. Reads reactive state, so call it in a `computed`. */
	isEnabled(): boolean;
	/**
	 * Opens the expose-all modal when there is something to expose. Resolves `true`
	 * when the modal opened. `onExposed` runs after the user exposes everything.
	 */
	offer(onExposed: () => Promise<void> | void): Promise<boolean>;
}
