// Load type definitions that come with Cypress module
/// <reference types="cypress" />

import { Interception } from 'cypress/types/net-stubbing';

interface SigninPayload {
	email: string;
	password: string;
}

declare global {
	namespace Cypress {
		interface SuiteConfigOverrides {
			disableAutoLogin: boolean;
		}

		interface Chainable {
			config(key: keyof SuiteConfigOverrides): boolean;
			getByTestId(
				selector: string,
				...args: (Partial<Loggable & Timeoutable & Withinable & Shadow> | undefined)[]
			): Chainable<JQuery<HTMLElement>>;
			findChildByTestId(childTestId: string): Chainable<JQuery<HTMLElement>>;
			createFixtureWorkflow(fixtureKey: string, workflowName: string): void;
			signin(payload: SigninPayload): void;
			signinAsOwner(): void;
			signout(): void;
			interceptREST(method: string, url: string): Chainable<Interception>;
			enableFeature(feature: string): void;
			disableFeature(feature: string): void;
			enableQueueMode(): void;
			disableQueueMode(): void;
			changeQuota(feature: string, value: number): void;
			waitForLoad(waitForIntercepts?: boolean): void;
			grantBrowserPermissions(...permissions: string[]): void;
			readClipboard(): Chainable<string>;
			paste(pastePayload: string): void;
			drag(
				selector: string | Cypress.Chainable<JQuery<HTMLElement>>,
				target: [number, number],
				options?: { abs?: boolean; index?: number; realMouse?: boolean; clickToFinish?: boolean },
			): void;
			draganddrop(draggableSelector: string, droppableSelector: string): void;
			push(type: string, data: unknown): void;
			shouldNotHaveConsoleErrors(): void;
			window(): Chainable<
				AUTWindow & {
					featureFlags: {
						override: (feature: string, value: any) => void;
					};
				}
			>;
			resetDatabase(): void;
		}
	}
}

export {};
