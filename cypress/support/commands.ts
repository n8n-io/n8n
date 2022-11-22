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

Cypress.Commands.add(
	'signin',
	(email, password) => {
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

Cypress.Commands.add('signup', (email, firstName, lastName, password) => {
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
