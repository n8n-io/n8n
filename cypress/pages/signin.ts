import { N8N_AUTH_COOKIE } from '../constants';
import { BasePage } from './base';
import { WorkflowsPage } from './workflows';

export class SigninPage extends BasePage {
	url = '/signin';

	getters = {
		form: () => cy.getByTestId('auth-form'),
		email: () => cy.getByTestId('email'),
		password: () => cy.getByTestId('password'),
		submit: () => cy.get('button'),
	};

	actions = {
		loginWithEmailAndPassword: (email: string, password: string) => {
			const signinPage = new SigninPage();
			const workflowsPage = new WorkflowsPage();

			cy.session(
				[email, password],
				() => {
					cy.visit(signinPage.url);

					this.getters.form().within(() => {
						this.getters.email().type(email);
						this.getters.password().type(password);
						this.getters.submit().click();
					});

					// we should be redirected to /workflows
					cy.url().should('include', workflowsPage.url);
				},
				{
					validate() {
						cy.getCookie(N8N_AUTH_COOKIE).should('exist');
					},
				},
			);
		},
	};
}
