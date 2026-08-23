import type { Component } from 'vue';

/**
 * Shared state shape a modal is initialized with. The SDK owns this type; the
 * editor-ui shell re-exports it from `@/Interface` for backwards compatibility.
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
