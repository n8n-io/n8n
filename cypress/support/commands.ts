import 'cypress-real-events';
import { WorkflowPage } from '../pages';
import { BACKEND_BASE_URL, N8N_AUTH_COOKIE } from '../constants';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
	return cy.get(`[data-test-id="${selector}"]`, ...args);
});

Cypress.Commands.add('createFixtureWorkflow', (fixtureKey, workflowName) => {
	const workflowPage = new WorkflowPage();

	// We need to force the click because the input is hidden
	workflowPage.getters
		.workflowImportInput()
		.selectFile(`cypress/fixtures/${fixtureKey}`, { force: true });

	cy.waitForLoad(false);
	workflowPage.actions.setWorkflowName(workflowName);

	workflowPage.getters.saveButton().should('contain', 'Saved');
});

Cypress.Commands.add(
	'findChildByTestId',
	{ prevSubject: true },
	(subject: Cypress.Chainable<JQuery<HTMLElement>>, childTestId) => {
		return subject.find(`[data-test-id="${childTestId}"]`);
	},
);

Cypress.Commands.add('waitForLoad', (waitForIntercepts = true) => {
	// These aliases are set-up before each test in cypress/support/e2e.ts
	// we can't set them up here because at this point it would be too late
	// and the requests would already have been made
	if (waitForIntercepts) {
		cy.wait(['@loadSettings']);
	}
	cy.getByTestId('node-view-loader', { timeout: 20000 }).should('not.exist');
	cy.get('.el-loading-mask', { timeout: 20000 }).should('not.exist');
});

Cypress.Commands.add('signin', ({ email, password }) => {
	Cypress.session.clearAllSavedSessions();
	cy.session(
		[email, password],
		() => cy.request('POST', `${BACKEND_BASE_URL}/rest/login`, { email, password }),
		{
			validate() {
				cy.getCookie(N8N_AUTH_COOKIE).should('exist');
			},
		},
	);
});

Cypress.Commands.add('signout', () => {
	cy.request('POST', `${BACKEND_BASE_URL}/rest/logout`);
	cy.getCookie(N8N_AUTH_COOKIE).should('not.exist');
});

Cypress.Commands.add('interceptREST', (method, url) => {
	cy.intercept(method, `${BACKEND_BASE_URL}/rest${url}`);
});

const setFeature = (feature: string, enabled: boolean) =>
	cy.request('PATCH', `${BACKEND_BASE_URL}/rest/e2e/feature`, {
		feature: `feat:${feature}`,
		enabled,
	});

Cypress.Commands.add('enableFeature', (feature: string) => setFeature(feature, true));
Cypress.Commands.add('disableFeature', (feature): string => setFeature(feature, false));

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
	const index = options?.index || 0;
	const [xDiff, yDiff] = pos;
	const element = typeof selector === 'string' ? cy.get(selector).eq(index) : selector;
	element.should('exist');

	element.then(([$el]) => {
		const originalLocation = $el.getBoundingClientRect();
		const newPosition = {
			x: options?.abs ? xDiff : originalLocation.right + xDiff,
			y: options?.abs ? yDiff : originalLocation.top + yDiff,
		}
		if(options?.realMouse) {
			element.realMouseDown();
			element.realMouseMove(newPosition.x, newPosition.y);
			element.realMouseUp();
		} else {
			element.trigger('mousedown', {force: true});
			element.trigger('mousemove', {
				which: 1,
				pageX: newPosition.x,
				pageY: newPosition.y,
				force: true,
			});
			if (options?.clickToFinish) {
				// Click to finish the drag
				// For some reason, mouseup isn't working when moving nodes
				cy.get('body').click(newPosition.x, newPosition.y);
			} else {
				element.trigger('mouseup', {force: true});
			}
		}
	});
});

Cypress.Commands.add('draganddrop', (draggableSelector, droppableSelector) => {
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
				// We can't use realMouseDown here because it hangs headless run
				cy.get(draggableSelector).trigger('mousedown');
			}
			// We don't chain these commands to make sure cy.get is re-trying correctly
			cy.get(droppableSelector).realMouseMove(pageX, pageY);
			cy.get(droppableSelector).realHover();
			cy.get(droppableSelector).realMouseUp();
			if (draggableSelector) {
				cy.get(draggableSelector).realMouseUp();
			}
		});
});
