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

import { SigninPage, SignupPage } from "../pages";

Cypress.Commands.add('getByTestId', (selector, ...args) => {
	return cy.get(`[data-test-id="${selector}"]`, ...args)
})

Cypress.Commands.add('signin', (email, password) => {
	const signinPage = new SigninPage();

	cy.session([email, password], () => {
		cy.visit(signinPage.url);

		signinPage.get('form').within(() => {
			signinPage.get('email').type(email);
			signinPage.get('password').type(password);
			signinPage.get('submit').click();
		});

		// we should be redirected to /workflows
		cy.url().should('include', '/workflows');

		// our auth cookie should be present
		cy.getCookie('n8n-auth').should('exist');
	});
});

Cypress.Commands.add('signup', (email, firstName, lastName, password) => {
	const signupPage = new SignupPage();
	cy.visit(signupPage.url);
	signupPage.get('form').within(() => {
		signupPage.get('email').type(email);
		signupPage.get('firstName').type(firstName);
		signupPage.get('lastName').type(lastName);
		signupPage.get('password').type(password);
		signupPage.get('submit').click();
	});
})
