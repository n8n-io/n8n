import { BasePage } from './base';
import { SigninPage } from './signin';
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
export class MfaLoginPage extends BasePage {
	url = '/mfa';

	getters = {
		form: () => cy.getByTestId('mfa-login-form'),
		mfaCode: () => cy.getByTestId('mfaCode'),
		mfaRecoveryCode: () => cy.getByTestId('mfaRecoveryCode'),
		enterRecoveryCodeButton: () => cy.getByTestId('mfa-enter-recovery-code-button'),
	};

	actions = {
		loginWithMfaCode: (email: string, password: string, mfaCode: string) => {
			const signinPage = new SigninPage();
			const workflowsPage = new WorkflowsPage();

			cy.session(
				[mfaCode],
				() => {
					cy.visit(signinPage.url);

					signinPage.getters.form().within(() => {
						signinPage.getters.email().type(email);
						signinPage.getters.password().type(password);
						signinPage.getters.submit().click();
					});

					this.getters.form().within(() => {
						this.getters.mfaCode().type(mfaCode);
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
		loginWithMfaRecoveryCode: (email: string, password: string, mfaRecoveryCode: string) => {
			const signinPage = new SigninPage();
			const workflowsPage = new WorkflowsPage();

			cy.session(
				[mfaRecoveryCode],
				() => {
					cy.visit(signinPage.url);

					signinPage.getters.form().within(() => {
						signinPage.getters.email().type(email);
						signinPage.getters.password().type(password);
						signinPage.getters.submit().click();
					});

					this.getters.enterRecoveryCodeButton().click();

					this.getters.form().within(() => {
						this.getters.mfaRecoveryCode().type(mfaRecoveryCode);
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
