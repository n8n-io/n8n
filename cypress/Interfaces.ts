export type IE2ETestPageElement = (...args: unknown[]) => Cypress.Chainable<JQuery<HTMLElement>>;

export interface IE2ETestPage {
	url?: string;
	elements: Record<string, IE2ETestPageElement>;
	get(id: string, ...args: unknown[]): ReturnType<IE2ETestPageElement>;
}
