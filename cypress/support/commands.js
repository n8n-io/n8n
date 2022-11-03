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

import {SignupPage} from "../pages/signup";

Cypress.Commands.add('getByTestId', (selector, ...args) => {
	return cy.get(`[data-test-id="${selector}"]`, ...args)
})

Cypress.Commands.add('signin', (email, password) => {
	cy.session([email, password], () => {
		cy.visit('/signin');

		cy.getByTestId('signin-form').within(() => {
			cy.getByTestId('email').type(email);
			cy.getByTestId('password').type(password);

			cy.get('button').click();
		});

		// we should be redirected to /dashboard
		cy.url().should('include', '/workflow');

		// our auth cookie should be present
		cy.getCookie('n8n-auth').should('exist');
	});
});

const signupPage = new SignupPage();

Cypress.Commands.add('signup', (email, firstName, lastName, password) => {
	cy.visit(signupPage.url);
	signupPage.get('form').within(() => {
		signupPage.get('email').type(email);
		signupPage.get('firstName').type(firstName);
		signupPage.get('lastName').type(lastName);
		signupPage.get('password').type(password);
		signupPage.get('button').click();
	});
})
