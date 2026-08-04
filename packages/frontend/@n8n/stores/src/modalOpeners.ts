/**
 * The modal-opening capability injected into stores that were decoupled from
 * `ui.store`. Stores receive this pair via `registerModalOpeners`
 * rather than importing `ui.store`; a consumer may use only a subset.
 *
 * Declared with method syntax so the parameters stay bivariant: the app injects
 * its `ui.store` openers, which are typed with the narrower `ModalKey` union,
 * without needing a cast at the injection site.
 */
export interface ModalOpeners {
	openModal(name: string): void;
	openModalWithData(payload: { name: string; data: Record<string, unknown> }): void;
}
