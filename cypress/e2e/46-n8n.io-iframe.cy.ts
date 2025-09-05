import { WorkflowsPage } from '../pages';

const workflowsPage = new WorkflowsPage();

// Migrated to Playwright
// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('n8n.io iframe', () => {
	describe('when telemetry is disabled', () => {
		it('should not load the iframe when visiting /home/workflows', () => {
			cy.overrideSettings({ telemetry: { enabled: false } });

			cy.visit(workflowsPage.url);

			cy.get('iframe').should('not.exist');
		});
	});

	describe('when telemetry is enabled', () => {
		it('should load the iframe when visiting /home/workflows', () => {
			const testInstanceId = 'test-instance-id';

			cy.overrideSettings({ telemetry: { enabled: true }, instanceId: testInstanceId });

			const testUserId = Cypress.env('currentUserId');

			const iframeUrl = `https://n8n.io/self-install?instanceId=${testInstanceId}&userId=${testUserId}`;

			cy.intercept(iframeUrl, (req) => req.reply(200)).as('iframeRequest');

			cy.visit(workflowsPage.url);

			cy.get('iframe').should('exist').and('have.attr', 'src', iframeUrl);

			cy.wait('@iframeRequest').its('response.statusCode').should('eq', 200);
		});
	});
});
