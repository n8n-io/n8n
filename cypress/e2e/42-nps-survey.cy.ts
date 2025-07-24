import { INSTANCE_ADMIN } from '../constants';
import { clearNotifications } from '../pages/notifications';
import {
	getNpsSurvey,
	getNpsSurveyClose,
	getNpsSurveyEmail,
	getNpsSurveyRatings,
} from '../pages/npsSurvey';
import { WorkflowPage } from '../pages/workflow';

const workflowPage = new WorkflowPage();

const NOW = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const THREE_DAYS = ONE_DAY * 3;
const SEVEN_DAYS = ONE_DAY * 7;
const ABOUT_SIX_MONTHS = ONE_DAY * 30 * 6 + ONE_DAY;

describe('NpsSurvey', () => {
	beforeEach(() => {
		cy.resetDatabase();
		cy.signin(INSTANCE_ADMIN);
	});

	it('shows nps survey to recently activated user and can submit email ', () => {
		cy.intercept('/rest/settings', { middleware: true }, (req) => {
			req.on('response', (res) => {
				if (res.body.data) {
					res.body.data.telemetry = {
						enabled: true,
						config: {
							key: 'test',
							url: 'https://telemetry-test.n8n.io',
							proxy: 'http://localhost:5678/rest/telemetry/proxy',
							sourceConfig: 'http://localhost:5678/rest/telemetry/rudderstack',
						},
					};
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

		workflowPage.actions.visit(true, NOW);

		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('be.visible');
		getNpsSurveyRatings().find('button').should('have.length', 11);
		getNpsSurveyRatings().find('button').first().click();

		getNpsSurveyEmail().find('input').type('test@n8n.io');
		getNpsSurveyEmail().find('button').click();

		// test that modal does not show up again until 6 months later
		workflowPage.actions.visit(true, NOW + ONE_DAY);
		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('not.be.visible');

		// 6 months later
		workflowPage.actions.visit(true, NOW + ABOUT_SIX_MONTHS);
		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('be.visible');
	});

	it('allows user to ignore survey 3 times before stopping to show until 6 months later', () => {
		cy.intercept('/rest/settings', { middleware: true }, (req) => {
			req.on('response', (res) => {
				if (res.body.data) {
					res.body.data.telemetry = {
						enabled: true,
						config: {
							key: 'test',
							url: 'https://telemetry-test.n8n.io',
							proxy: 'http://localhost:5678/rest/telemetry/proxy',
							sourceConfig: 'http://localhost:5678/rest/telemetry/rudderstack',
						},
					};
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

		// can ignore survey and it won't show up again
		workflowPage.actions.visit(true, NOW);
		workflowPage.actions.saveWorkflowOnButtonClick();
		clearNotifications();

		getNpsSurvey().should('be.visible');
		getNpsSurveyClose().click();
		getNpsSurvey().should('not.be.visible');

		workflowPage.actions.visit(true, NOW + ONE_DAY);
		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('not.be.visible');

		// shows up seven days later to ignore again
		workflowPage.actions.visit(true, NOW + SEVEN_DAYS + 10000);
		workflowPage.actions.saveWorkflowOnButtonClick();
		clearNotifications();
		getNpsSurvey().should('be.visible');
		getNpsSurveyClose().click();
		getNpsSurvey().should('not.be.visible');

		workflowPage.actions.visit(true, NOW + SEVEN_DAYS + 10000);
		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('not.be.visible');

		// shows up after at least seven days later to ignore again
		workflowPage.actions.visit(true, NOW + (SEVEN_DAYS + 10000) * 2 + ONE_DAY);
		workflowPage.actions.saveWorkflowOnButtonClick();
		clearNotifications();
		getNpsSurvey().should('be.visible');
		getNpsSurveyClose().click();
		getNpsSurvey().should('not.be.visible');

		workflowPage.actions.visit(true, NOW + (SEVEN_DAYS + 10000) * 2 + ONE_DAY * 2);
		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('not.be.visible');

		// does not show up again after at least 7 days
		workflowPage.actions.visit(true, NOW + (SEVEN_DAYS + 10000) * 3 + ONE_DAY * 3);
		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('not.be.visible');

		// shows up 6 months later
		workflowPage.actions.visit(true, NOW + (SEVEN_DAYS + 10000) * 3 + ABOUT_SIX_MONTHS);
		workflowPage.actions.saveWorkflowOnButtonClick();
		getNpsSurvey().should('be.visible');
	});
});
