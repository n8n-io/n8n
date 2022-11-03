import { BasePage } from "./base";

export class SignupPage extends BasePage {
	url = '/signup';
	elements = {
		form: () => cy.getByTestId('auth-form'),
		email: () => cy.getByTestId('email'),
		firstName: () => cy.getByTestId('firstName'),
		lastName: () => cy.getByTestId('lastName'),
		password: () => cy.getByTestId('password'),
		submit: () => cy.getByTestId('submit'),
	}
}
