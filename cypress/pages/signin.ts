import { BasePage } from './base';
import { WorkflowsPage } from './workflows';
import { N8N_AUTH_COOKIE } from '../constants';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class SigninPage extends BasePage {
	url = '/signin';

	getters = {
		form: () => cy.getByTestId('auth-form'),
		email: () => cy.getByTestId('emailOrLdapLoginId'),
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
