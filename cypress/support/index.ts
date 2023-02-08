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

type DragOptions = Partial<Cypress.ClickOptions & {
  source: Cypress.ClickOptions
  target: Cypress.ClickOptions
}>

type MoveOptions = Partial<Cypress.ClickOptions & {
  deltaX: number
  deltaY: number
}>

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
			drag<K extends keyof HTMLElementTagNameMap>(targetSelector: K, options?: DragOptions): true
			drag<E extends Node = HTMLElement>(targetSelector: string, options?: DragOptions): true
			drag(targetAlias: string, options?: DragOptions): true
			move(options: MoveOptions): Chainable<Element>
		}
	}
}

export {};
