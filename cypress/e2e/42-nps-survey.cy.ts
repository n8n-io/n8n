import { getNpsSurvey, getNpsSurveyEmail, getNpsSurveyRatings } from '../pages/npsSurvey';
import { WorkflowPage } from '../pages/workflow';

const workflowPage = new WorkflowPage();

const NOW = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const THREE_DAYS = ONE_DAY * 3;

describe('NpsSurvey', () => {
	it('shows nps survey to recently activated user and can submit email ', () => {
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

		getNpsSurvey().should('be.visible');
		getNpsSurveyRatings().find('button').should('have.length', 11);

		getNpsSurveyRatings().find('button').first().click();

		getNpsSurveyEmail().find('input').type('test@n8n.io');
		getNpsSurveyEmail().find('button').click();

		// test that modal does not show up again
		cy.reload();

		workflowPage.actions.visit();
		workflowPage.actions.saveWorkflowOnButtonClick();

		getNpsSurvey().should('not.be.visible');
	});
});
