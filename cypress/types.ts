export type IE2ETestPageElement = (
	...args: any[]
) =>
	| Cypress.Chainable<JQuery<HTMLElement>>
	| Cypress.Chainable<JQuery<HTMLInputElement>>
	| Cypress.Chainable<JQuery<HTMLButtonElement>>;

export interface IE2ETestPage {
	url?: string;
	getters: Record<string, IE2ETestPageElement>;
	actions: Record<string, (...args: any[]) => void>;
}
