import type { Component } from 'vue';

/**
 * Shared state shape a modal is initialized with. Canonical definition lives
 * here so the module contract does not depend on the editor-ui shell; the shell
 * re-exports it from `@/Interface` for backwards compatibility.
 */
export type ModalState = {
	open: boolean;
	mode?: string | null;
	data?: Record<string, unknown>;
	activeId?: string | null;
	curlCommand?: string;
	httpNodeParameters?: string;
};

export type ModalDefinition = {
	key: string;
	component: Component | (() => Promise<Component>);
	initialState?: ModalState;
};
