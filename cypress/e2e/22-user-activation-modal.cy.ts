import { WorkflowPage, NDV, UserActivationSurveyModal } from '../pages';
import SettingsWithActivationModalEnabled from '../fixtures/Settings_user_activation_modal_enabled.json';
import { v4 as uuid } from 'uuid';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const userActivationSurveyModal = new UserActivationSurveyModal();

const BASE_WEBHOOK_URL = 'http://localhost:5678/webhook';

describe('User activation survey', () => {
	it('Should show activation survey', () => {
		cy.resetAll();

		cy.skipSetup();

		cy.intercept('GET', '/rest/settings', (req) => {
			req.reply(SettingsWithActivationModalEnabled);
		});

		const path = uuid();
		const method = 'GET';

		workflowPage.actions.addInitialNodeToCanvas('Webhook');
		workflowPage.actions.openNode('Webhook');

		//input http method
		cy.getByTestId('parameter-input-httpMethod').click();
		cy.getByTestId('parameter-input-httpMethod')
			.find('.el-select-dropdown')
			.find('.option-headline')
			.contains(method)
			.click();

		//input path method
		cy.getByTestId('parameter-input-path')
			.find('.parameter-input')
			.find('input')
			.clear()
			.type(path);

		ndv.actions.close();

		workflowPage.actions.saveWorkflowOnButtonClick();

		workflowPage.actions.activateWorkflow();

		cy.intercept('GET', '/rest/workflows').as('getWorkflows');
		cy.intercept('GET', '/rest/credentials').as('getCredentials');
		cy.intercept('GET', '/rest/active').as('getActive');

		cy.request(method, `${BASE_WEBHOOK_URL}/${path}`).then((response) => {
			expect(response.status).to.eq(200);
			cy.visit('/');
			cy.reload();

			cy.wait(['@getWorkflows', '@getCredentials', '@getActive']);
			userActivationSurveyModal.getters.modalContainer().should('be.visible');
			userActivationSurveyModal.getters.feedbackInput().should('be.visible');
			userActivationSurveyModal.getters.feedbackInput().type('testing');
			userActivationSurveyModal.getters.feedbackInput().should('have.value', 'testing');
			userActivationSurveyModal.getters.sendFeedbackButton().click();
		});
	});
});
