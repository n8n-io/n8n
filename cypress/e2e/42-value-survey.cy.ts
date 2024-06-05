import { WorkflowPage } from '../pages/workflow';

const workflowPage = new WorkflowPage();

const NOW = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const THREE_DAYS = ONE_DAY * 3;

describe('ValueSurvey', () => {
	it('shows Value Survey if user recently activated', () => {
		cy.intercept('/rest/settings', { middleware: true }, (req) => {
			req.on('response', (res) => {
				if (res.body.data) {
					res.body.data.telemetry = { enabled: true };
				}
			});
		});

		cy.intercept('/rest/login', { middleware: true }, (req) => {
			req.on('response', (res) => {
				res.body.data.settings = {
					userActivated: true,
					userActivatedAt: NOW - THREE_DAYS - 1000,
				};
			});
		}).as('login');

		workflowPage.actions.visit();

		workflowPage.actions.addInitialNodeToCanvas('Manual');

		workflowPage.actions.saveWorkflowOnButtonClick();
	});
});
