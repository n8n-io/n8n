import { getValueSurvey, getValueSurveyEmail, getValueSurveyRatings } from '../pages/valueSurvey';
import { WorkflowPage } from '../pages/workflow';

const workflowPage = new WorkflowPage();

const NOW = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const THREE_DAYS = ONE_DAY * 3;

describe('ValueSurvey', () => {
	it('shows value survey to recently activated user and can submit email ', () => {
		cy.intercept('/rest/settings', { middleware: true }, (req) => {
			req.on('response', (res) => {
				if (res.body.data) {
					res.body.data.telemetry = { enabled: true };
				}
			});
		});

		cy.intercept('/rest/login', { middleware: true }, (req) => {
			req.on('response', (res) => {
				if (res.body.data) {
					res.body.data.settings = res.body.data.settings || {};
					res.body.data.settings.userActivated = true;
					res.body.data.settings.userActivatedAt = NOW - THREE_DAYS - 1000;
				}
			});
		});

		workflowPage.actions.visit();

		workflowPage.actions.saveWorkflowOnButtonClick();

		getValueSurvey().should('be.visible');
		getValueSurveyRatings().find('button').should('have.length', 11);

		getValueSurveyRatings().find('button').first().click();

		getValueSurveyEmail().find('input').type('test@n8n.io');
		getValueSurveyEmail().find('button').click();

		// test that modal does not show up again
		cy.reload();

		workflowPage.actions.visit();
		workflowPage.actions.saveWorkflowOnButtonClick();

		getValueSurvey().should('not.be.visible');
	});
});
