import 'cypress-real-events';
import type { FrontendSettings, N8nEnvFeatFlags } from '@n8n/api-types';
import FakeTimers from '@sinonjs/fake-timers';

import {
	BACKEND_BASE_URL,
	INSTANCE_ADMIN,
	INSTANCE_MEMBERS,
	INSTANCE_OWNER,
	N8N_AUTH_COOKIE,
} from '../constants';
import { WorkflowPage } from '../pages';

Cypress.Commands.add('setAppDate', (targetDate: number | Date) => {
	cy.window().then((win) => {
		FakeTimers.withGlobal(win).install({
			now: targetDate,
			toFake: ['Date'],
			shouldAdvanceTime: true,
		});
	});
});

Cypress.Commands.add('getByTestId', (selector, ...args) => {
	return cy.get(`[data-test-id="${selector}"]`, ...args);
});

Cypress.Commands.add('createFixtureWorkflow', (fixtureKey: string) => {
	const workflowPage = new WorkflowPage();

	// We need to force the click because the input is hidden
	workflowPage.getters.workflowImportInput().selectFile(`fixtures/${fixtureKey}`, { force: true });

	cy.waitForLoad(false);
	workflowPage.actions.saveWorkflowOnButtonClick();
	workflowPage.getters.saveButton().should('contain', 'Saved');
	workflowPage.actions.zoomToFit();
});

Cypress.Commands.addQuery('findChildByTestId', function (testId: string) {
	return (subject: Cypress.Chainable) => subject.find(`[data-test-id="${testId}"]`);
});

Cypress.Commands.add('waitForLoad', (waitForIntercepts = true) => {
	// These aliases are set-up before each test in cypress/support/e2e.ts
	// we can't set them up here because at this point it would be too late
	// and the requests would already have been made
	if (waitForIntercepts) {
		cy.wait(['@loadSettings', '@loadNodeTypes']);
	}
	cy.getByTestId('node-view-loader', { timeout: 20000 }).should('not.exist');
	cy.get('.el-loading-mask', { timeout: 20000 }).should('not.exist');
});

Cypress.Commands.add('signin', ({ email, password }) => {
	void Cypress.session.clearAllSavedSessions();
	cy.session([email, password], () => {
		return cy
			.request({
				method: 'POST',
				url: `${BACKEND_BASE_URL}/rest/login`,
				body: { emailOrLdapLoginId: email, password },
				failOnStatusCode: false,
			})
			.then((response) => {
				Cypress.env('currentUserId', response.body.data.id);
			});
	});
});

Cypress.Commands.add('signinAsOwner', () => cy.signin(INSTANCE_OWNER));
Cypress.Commands.add('signinAsAdmin', () => cy.signin(INSTANCE_ADMIN));
Cypress.Commands.add('signinAsMember', (index = 0) => cy.signin(INSTANCE_MEMBERS[index]));

Cypress.Commands.add('signout', () => {
	cy.request({
		method: 'POST',
		url: `${BACKEND_BASE_URL}/rest/logout`,
		headers: { 'browser-id': localStorage.getItem('n8n-browserId') },
	});
	cy.getCookie(N8N_AUTH_COOKIE).should('not.exist');
});

export let settings: Partial<FrontendSettings>;
Cypress.Commands.add('overrideSettings', (value: Partial<FrontendSettings>) => {
	settings = value;
});

const setFeature = (feature: string, enabled: boolean) =>
	cy.request('PATCH', `${BACKEND_BASE_URL}/rest/e2e/feature`, {
		feature: `feat:${feature}`,
		enabled,
	});

const setQuota = (feature: string, value: number) =>
	cy.request('PATCH', `${BACKEND_BASE_URL}/rest/e2e/quota`, {
		feature: `quota:${feature}`,
		value,
	});

const setQueueMode = (enabled: boolean) =>
	cy.request('PATCH', `${BACKEND_BASE_URL}/rest/e2e/queue-mode`, {
		enabled,
	});

Cypress.Commands.add('enableFeature', (feature: string) => setFeature(feature, true));
Cypress.Commands.add('changeQuota', (feature: string, value: number) => setQuota(feature, value));
Cypress.Commands.add('disableFeature', (feature: string) => setFeature(feature, false));
Cypress.Commands.add('enableQueueMode', () => setQueueMode(true));
Cypress.Commands.add('disableQueueMode', () => setQueueMode(false));

const setEnvFeatureFlags = (flags: N8nEnvFeatFlags) =>
	cy.request('PATCH', `${BACKEND_BASE_URL}/rest/e2e/env-feature-flags`, {
		flags,
	});

const getEnvFeatureFlags = () =>
	cy.request('GET', `${BACKEND_BASE_URL}/rest/e2e/env-feature-flags`);

// Environment feature flags commands (using E2E API)
Cypress.Commands.add('setEnvFeatureFlags', (flags: N8nEnvFeatFlags) =>
	setEnvFeatureFlags(flags).then((response) => response.body.data),
);
Cypress.Commands.add('clearEnvFeatureFlags', () =>
	setEnvFeatureFlags({}).then((response) => response.body.data),
);
Cypress.Commands.add('getEnvFeatureFlags', () =>
	getEnvFeatureFlags().then((response) => response.body.data),
);

Cypress.Commands.add('grantBrowserPermissions', (...permissions: string[]) => {
	if (Cypress.isBrowser('chrome')) {
		cy.wrap(
			Cypress.automation('remote:debugger:protocol', {
				command: 'Browser.grantPermissions',
				params: {
					permissions,
					origin: window.location.origin,
				},
			}),
		);
	}
});

Cypress.Commands.add('readClipboard', () =>
	cy.window().then((win) => win.navigator.clipboard.readText()),
);

Cypress.Commands.add('paste', { prevSubject: true }, (selector, pastePayload) => {
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
	cy.wrap(selector).then(($destination) => {
		const pasteEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
			clipboardData: {
				getData: () => pastePayload,
			},
		});
		$destination[0].dispatchEvent(pasteEvent);
	});
});

Cypress.Commands.add('drag', (selector, pos, options) => {
	const index = options?.index ?? 0;
	const [xDiff, yDiff] = pos;
	const element = typeof selector === 'string' ? cy.get(selector).eq(index) : selector;
	element.should('exist');

	element.then(([$el]) => {
		const originalLocation = $el.getBoundingClientRect();
		const newPosition = {
			x: options?.abs ? xDiff : originalLocation.right + xDiff,
			y: options?.abs ? yDiff : originalLocation.top + yDiff,
		};
		if (options?.realMouse) {
			element.realMouseDown();
			element.realMouseMove(0, 0);
			element.realMouseMove(newPosition.x, newPosition.y);
			element.realMouseUp();
		} else {
			element.trigger('mousedown', { force: true });
			element.trigger('mousemove', {
				which: 1,
				pageX: newPosition.x,
				pageY: newPosition.y,
				force: true,
			});
			if (options?.moveTwice) {
				// first move like hover to trigger object to be visible
				// like in main panel in ndv
				element.trigger('mousemove', {
					which: 1,
					pageX: newPosition.x,
					pageY: newPosition.y,
					force: true,
				});
			}
			if (options?.clickToFinish) {
				// Click to finish the drag
				// For some reason, mouseup isn't working when moving nodes
				cy.get('body').click(newPosition.x, newPosition.y);
			} else {
				element.trigger('mouseup', { force: true });
			}
		}
	});
});

Cypress.Commands.add('draganddrop', (draggableSelector, droppableSelector, options) => {
	if (draggableSelector) {
		cy.get(draggableSelector).should('exist');
	}
	cy.get(droppableSelector).should('exist');

	cy.get(droppableSelector)
		.first()
		.then(([$el]) => {
			const coords = $el.getBoundingClientRect();

			const pageX = coords.left + coords.width / 2;
			const pageY = coords.top + coords.height / 2;

			if (draggableSelector) {
				cy.get(draggableSelector).realMouseDown();
			}
			// We don't chain these commands to make sure cy.get is re-trying correctly
			cy.get(droppableSelector).realMouseMove(0, 0);
			cy.get(droppableSelector).realMouseMove(pageX, pageY);
			cy.get(droppableSelector).realHover();
			cy.get(droppableSelector).realMouseUp({ position: options?.position ?? 'top' });
			if (draggableSelector) {
				cy.get(draggableSelector).realMouseUp();
			}
		});
});

Cypress.Commands.add('push', (type, data) => {
	cy.request('POST', `${BACKEND_BASE_URL}/rest/e2e/push`, {
		type,
		data,
	});
});

Cypress.Commands.add('shouldNotHaveConsoleErrors', () => {
	cy.window().then((win) => {
		const spy = cy.spy(win.console, 'error');
		cy.wrap(spy).should('not.have.been.called');
	});
});

Cypress.Commands.add('resetDatabase', () => {
	cy.request('POST', `${BACKEND_BASE_URL}/rest/e2e/reset`, {
		owner: INSTANCE_OWNER,
		members: INSTANCE_MEMBERS,
		admin: INSTANCE_ADMIN,
	});
});

Cypress.Commands.add('clearIndexedDB', (dbName: string, storeName?: string) => {
	cy.window().then((win) => {
		return new Promise<void>((resolve, reject) => {
			if (!win.indexedDB) {
				resolve();
				return;
			}

			// If storeName is provided, clear specific store; otherwise delete entire database
			if (storeName) {
				const openRequest = win.indexedDB.open(dbName);

				openRequest.onsuccess = () => {
					const db = openRequest.result;

					if (!db.objectStoreNames.contains(storeName)) {
						db.close();
						resolve();
						return;
					}

					const transaction = db.transaction([storeName], 'readwrite');
					const store = transaction.objectStore(storeName);
					const clearRequest = store.clear();

					clearRequest.onsuccess = () => {
						db.close();
						resolve();
					};

					clearRequest.onerror = () => {
						db.close();
						// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
						reject(clearRequest.error);
					};
				};

				openRequest.onerror = () => {
					resolve(); // Database doesn't exist, nothing to clear
				};
			} else {
				const deleteRequest = win.indexedDB.deleteDatabase(dbName);

				deleteRequest.onsuccess = () => resolve();
				deleteRequest.onerror = () => resolve(); // Ignore errors if DB doesn't exist
				deleteRequest.onblocked = () => resolve(); // Ignore if blocked
			}
		});
	});
});

Cypress.Commands.add('interceptNewTab', () => {
	cy.window().then((win) => {
		cy.stub(win, 'open').as('windowOpen');
	});
});

Cypress.Commands.add('visitInterceptedTab', () => {
	cy.get('@windowOpen')
		.should('have.been.called')
		.then((stub: any) => {
			const url = stub.firstCall.args[0];
			cy.visit(url);
		});
});
