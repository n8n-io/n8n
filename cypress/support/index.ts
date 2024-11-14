// Load type definitions that come with Cypress module
/// <reference types="cypress" />

import type { FrontendSettings, PushPayload, PushType } from '@n8n/api-types';

Cypress.Keyboard.defaults({
	keystrokeDelay: 0,
});

interface SigninPayload {
	email: string;
	password: string;
}

interface DragAndDropOptions {
	position: 'top' | 'center' | 'bottom';
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
				...args: Array<Partial<Loggable & Timeoutable & Withinable & Shadow> | undefined>
			): Chainable<JQuery<HTMLElement>>;
			ifCanvasVersion<T1, T2>(getterV1: () => T1, getterV2: () => T2): T1 | T2;
			findChildByTestId(childTestId: string): Chainable<JQuery<HTMLElement>>;
			/**
			 * Creates a workflow from the given fixture and optionally renames it.
			 *
			 * @param fixtureKey
			 * @param [workflowName] Optional name for the workflow. A random nanoid is used if not given
			 */
			createFixtureWorkflow(fixtureKey: string, workflowName?: string): void;
			/** @deprecated use signinAsOwner, signinAsAdmin or signinAsMember instead */
			signin(payload: SigninPayload): void;
			signinAsOwner(): void;
			signinAsAdmin(): void;
			/**
			 * Omitting the index will default to index 0.
			 */
			signinAsMember(index?: number): void;
			signout(): void;
			overrideSettings(value: Partial<FrontendSettings>): void;
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
				selector: string | Chainable<JQuery<HTMLElement>>,
				target: [number, number],
				options?: {
					abs?: boolean;
					index?: number;
					realMouse?: boolean;
					clickToFinish?: boolean;
					moveTwice?: boolean;
				},
			): void;
			draganddrop(
				draggableSelector: string,
				droppableSelector: string,
				options?: Partial<DragAndDropOptions>,
			): void;
			push<Type extends PushType>(type: Type, data: PushPayload<Type>): void;
			shouldNotHaveConsoleErrors(): void;
			window(): Chainable<
				AUTWindow & {
					innerWidth: number;
					innerHeight: number;
					preventNodeViewBeforeUnload?: boolean;
					maxPinnedDataSize?: number;
					featureFlags: {
						override: (feature: string, value: unknown) => void;
					};
				}
			>;
			resetDatabase(): void;
			setAppDate(targetDate: number | Date): void;
		}
	}
}

export {};
