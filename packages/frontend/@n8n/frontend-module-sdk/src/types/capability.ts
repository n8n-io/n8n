/**
 * A typed key for a capability. `declareCapability()` is the only way to make
 * one, and the token is the only way to read or write its slot in the registry.
 */
export interface CapabilityToken<T> {
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
