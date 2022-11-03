export type IE2ETestPageElement<T> = (...args: unknown[]) => Cypress.Chainable<JQuery<T>>;

export interface IE2ETestPage {
	url?: string;
	elements: Record<string, IE2ETestPageElement<unknown>>;
	get(id: string, ...args: unknown[]): ReturnType<IE2ETestPageElement<unknown>>;
}
