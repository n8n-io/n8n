export type IE2ETestPageElement = (
	...args: unknown[]
) =>
	| Cypress.Chainable<JQuery<HTMLElement>>
	| Cypress.Chainable<JQuery<HTMLInputElement>>
	| Cypress.Chainable<JQuery<HTMLButtonElement>>;

type Getter = IE2ETestPageElement | ((key: string | number) => IE2ETestPageElement);

export interface IE2ETestPage {
	url?: string;
	getters: Record<string, Getter>;
	actions: Record<string, (...args: unknown[]) => void>;
}

interface Execution {
	workflowId: string;
}

export interface ExecutionResponse {
	data: {
		results: Execution[];
	};
}

export type OpenContextMenuOptions = {
	method?: 'right-click' | 'overflow-button';
	anchor?: 'topRight' | 'topLeft' | 'center' | 'bottomRight' | 'bottomLeft';
};
