// Load type definitions that come with Cypress module
/// <reference types="cypress" />

import { Interception } from 'cypress/types/net-stubbing';

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

interface SignupPayload extends SetupPayload {
	url: string;
}

interface InviteUsersPayload {
	instanceOwner: SigninPayload;
	users: SetupPayload[];
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
			signout(): void;
			signup(payload: SignupPayload): void;
			setup(payload: SetupPayload): void;
			setupOwner(payload: SetupPayload): void;
			inviteUsers(payload: InviteUsersPayload): void;
			interceptREST(method: string, url: string): Chainable<Interception>;
			skipSetup(): void;
			resetAll(): void;
			enableFeature(feature: string): void;
			waitForLoad(): void;
			grantBrowserPermissions(...permissions: string[]): void;
			readClipboard(): Chainable<string>;
			paste(pastePayload: string): void;
			drag(selector: string, target: [number, number]): void;
			draganddrop(selector: string, target: string): void;
		}
	}
}

export {};
