export type IE2ETestPageElement = (...args: unknown[]) =>
	| Cypress.Chainable<JQuery<HTMLElement>>
	| Cypress.Chainable<JQuery<HTMLButtonElement>>;

export interface IE2ETestPage {
	url?: string;
	elements: Record<string, IE2ETestPageElement>;
	get(id: string, ...args: unknown[]): ReturnType<IE2ETestPageElement>;
}
