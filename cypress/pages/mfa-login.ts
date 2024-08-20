import { N8N_AUTH_COOKIE } from '../constants';
import { BasePage } from './base';
import { SigninPage } from './signin';
import { WorkflowsPage } from './workflows';

export class MfaLoginPage extends BasePage {
	url = '/mfa';

	getters = {
		form: () => cy.getByTestId('mfa-login-form'),
		token: () => cy.getByTestId('token'),
		recoveryCode: () => cy.getByTestId('recoveryCode'),
		enterRecoveryCodeButton: () => cy.getByTestId('mfa-enter-recovery-code-button'),
	};

	actions = {
		loginWithMfaToken: (email: string, password: string, mfaToken: string) => {
			const signinPage = new SigninPage();
			const workflowsPage = new WorkflowsPage();

			cy.session(
				[mfaToken],
				() => {
					cy.visit(signinPage.url);

					signinPage.getters.form().within(() => {
						signinPage.getters.email().type(email);
						signinPage.getters.password().type(password);
						signinPage.getters.submit().click();
					});

					this.getters.form().within(() => {
						this.getters.token().type(mfaToken);
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
		loginWithRecoveryCode: (email: string, password: string, recoveryCode: string) => {
			const signinPage = new SigninPage();
			const workflowsPage = new WorkflowsPage();

			cy.session(
				[recoveryCode],
				() => {
					cy.visit(signinPage.url);

					signinPage.getters.form().within(() => {
						signinPage.getters.email().type(email);
						signinPage.getters.password().type(password);
						signinPage.getters.submit().click();
					});

					this.getters.enterRecoveryCodeButton().click();

					this.getters.form().within(() => {
						this.getters.recoveryCode().type(recoveryCode);
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
