import { BasePage } from "./base";

export class SignupPage extends BasePage {
	url = '/setup';
	getters = {
		form: () => cy.getByTestId('auth-form'),
		email: () => cy.getByTestId('email'),
		firstName: () => cy.getByTestId('firstName'),
		lastName: () => cy.getByTestId('lastName'),
		password: () => cy.getByTestId('password'),
		submit: () => cy.get('button'),
	}
}
