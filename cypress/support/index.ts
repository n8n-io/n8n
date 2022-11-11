// Load type definitions that come with Cypress module
/// <reference types="cypress" />

declare global {
	namespace Cypress {
		interface Chainable {
			getByTestId(selector: string, ...args: (Partial<Loggable & Timeoutable & Withinable & Shadow> | undefined)[]): Chainable<JQuery<HTMLElement>>
			findChildByTestId(childTestId: string): Chainable<JQuery<HTMLElement>>
			createFixtureWorkflow(fixtureKey: string, workflowName: string): void;
			signin(email: string, password: string): void;
			signup(email: string,  firstName: string, lastName: string, password: string): void;
		}
	}
}

export {};
