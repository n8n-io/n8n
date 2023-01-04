// Load type definitions that come with Cypress module
/// <reference types="cypress" />

interface SigninPayload {
	email: string;
	password: string;
}

interface SetupPayload {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

declare global {
	namespace Cypress {
		interface Chainable {
			getByTestId(
				selector: string,
				...args: (Partial<Loggable & Timeoutable & Withinable & Shadow> | undefined)[]
			): Chainable<JQuery<HTMLElement>>;
			findChildByTestId(childTestId: string): Chainable<JQuery<HTMLElement>>;
			createFixtureWorkflow(fixtureKey: string, workflowName: string): void;
			signin(payload: SigninPayload): void;
			setup(payload: SetupPayload): void;
			setupOwner(payload: SetupPayload): void;
			skipSetup(): void;
			resetAll(): void;
			enableFeature(feature: string): void;
			waitForLoad(): void;
			grantBrowserPermissions(...permissions: string[]): void;
			readClipboard(): Chainable<string>;
			paste(pastePayload: string): void;
			drag(selector: string, xDiff: number, yDiff: number): void;
		}
	}
}

export {};
