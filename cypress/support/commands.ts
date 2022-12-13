// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import { WorkflowsPage, SigninPage, SignupPage } from "../pages";
import { N8N_AUTH_COOKIE } from "../constants";
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { MessageBox } from '../pages/modals/message-box';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
	return cy.get(`[data-test-id="${selector}"]`, ...args)
})

Cypress.Commands.add('createFixtureWorkflow', (fixtureKey, workflowName) => {
	const WorkflowPage = new WorkflowPageClass()

	// We need to force the click because the input is hidden
	WorkflowPage.getters.workflowImportInput().selectFile(`cypress/fixtures/${fixtureKey}`, { force: true});
	WorkflowPage.getters.workflowNameInput().should('be.disabled');
	WorkflowPage.getters.workflowNameInput().parent().click()
	WorkflowPage.getters.workflowNameInput().should('be.enabled');
	WorkflowPage.getters.workflowNameInput().clear().type(workflowName).type('{enter}');

	WorkflowPage.getters.saveButton().should('contain', 'Saved');
})

Cypress.Commands.add('findChildByTestId', { prevSubject: true }, (subject: Cypress.Chainable<JQuery<HTMLElement>>, childTestId) => {
	return subject.find(`[data-test-id="${childTestId}"]`);
})

Cypress.Commands.add('waitForLoad', () => {
	cy.getByTestId('node-view-loader').should('not.exist', { timeout: 10000 });
	cy.get('.el-loading-mask').should('not.exist', { timeout: 10000 });
})

Cypress.Commands.add(
	'signin',
	({ email, password }) => {
		const signinPage = new SigninPage();
		const workflowsPage = new WorkflowsPage();

		cy.session([email, password], () => {
			cy.visit(signinPage.url);

			signinPage.getters.form().within(() => {
				signinPage.getters.email().type(email);
				signinPage.getters.password().type(password);
				signinPage.getters.submit().click();
			});

			// we should be redirected to /workflows
			cy.url().should('include', workflowsPage.url);
		},
		{
			validate() {
				cy.getCookie(N8N_AUTH_COOKIE).should('exist');
			},
		});
});

Cypress.Commands.add('setup', ({ email, firstName, lastName, password }) => {
	const signupPage = new SignupPage();

	cy.visit(signupPage.url);

	signupPage.getters.form().within(() => {
		cy.url().then((url) => {
			if (url.endsWith(signupPage.url)) {
				signupPage.getters.email().type(email);
				signupPage.getters.firstName().type(firstName);
				signupPage.getters.lastName().type(lastName);
				signupPage.getters.password().type(password);
				signupPage.getters.submit().click();
			} else {
				cy.log('User already signed up');
			}
		});
	});
})

Cypress.Commands.add('skipSetup', () => {
	const signupPage = new SignupPage();
	const workflowsPage = new WorkflowsPage();
	const Confirmation = new MessageBox();

	cy.visit(signupPage.url);

	signupPage.getters.form().within(() => {
		cy.url().then((url) => {
			if (url.endsWith(signupPage.url)) {
				signupPage.getters.skip().click();


				Confirmation.getters.header().should('contain.text', 'Skip owner account setup?');
				Confirmation.actions.confirm();

				// we should be redirected to /workflows
				cy.url().should('include', workflowsPage.url);
			} else {
				cy.log('User already signed up');
			}
		});
	});
})

Cypress.Commands.add('resetAll', () => {
	cy.task('reset');
	Cypress.session.clearAllSavedSessions();
});

Cypress.Commands.add('setupOwner', (payload) => {
	cy.task('setup-owner', payload);
});

Cypress.Commands.add('grantBrowserPermissions', (...permissions: string[]) => {
	if(Cypress.isBrowser('chrome')) {
		cy.wrap(Cypress.automation('remote:debugger:protocol', {
			command: 'Browser.grantPermissions',
			params: {
				permissions,
				origin: window.location.origin,
			},
		}));
	}
});
Cypress.Commands.add('readClipboard', () => cy.window().its('navigator.clipboard').invoke('readText'));
Cypress.Commands.add('paste', { prevSubject: true }, (selector, pastePayload) => {
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
	cy.wrap(selector).then($destination => {
		const pasteEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
		clipboardData: {
			getData: () => pastePayload
		}
		});
		$destination[0].dispatchEvent(pasteEvent);
	});
});
