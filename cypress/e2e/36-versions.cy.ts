import { WorkflowsPage } from '../pages/workflows';
import {
	closeVersionUpdatesPanel,
	getVersionCard,
	getVersionUpdatesPanelOpenButton,
	openVersionUpdatesPanel,
} from '../composables/versions';

const workflowsPage = new WorkflowsPage();

describe('Versions', () => {
	it('should open updates panel', () => {
		cy.overrideSettings({
			releaseChannel: 'stable',
			versionCli: '1.0.0',
			versionNotifications: {
				enabled: true,
				endpoint: 'https://api.n8n.io/api/versions/',
				infoUrl: 'https://docs.n8n.io/getting-started/installation/updating.html',
			},
		});

		cy.intercept('GET', 'https://api.n8n.io/api/versions/1.0.0', [
			{
				name: '1.3.1',
				createdAt: '2023-08-18T11:53:12.857Z',
				hasSecurityIssue: null,
				hasSecurityFix: null,
				securityIssueFixVersion: null,
				hasBreakingChange: null,
				documentationUrl: 'https://docs.n8n.io/release-notes/#n8n131',
				nodes: [],
				description: 'Includes <strong>bug fixes</strong>',
			},
			{
				name: '1.0.5',
				createdAt: '2023-07-24T10:54:56.097Z',
				hasSecurityIssue: false,
				hasSecurityFix: null,
				securityIssueFixVersion: null,
				hasBreakingChange: true,
				documentationUrl: 'https://docs.n8n.io/release-notes/#n8n104',
				nodes: [],
				description: 'Includes <strong>core functionality</strong> and <strong>bug fixes</strong>',
			},
		]);

		cy.visit(workflowsPage.url);
		cy.wait('@loadSettings');

		getVersionUpdatesPanelOpenButton().should('contain', '2 updates');
		openVersionUpdatesPanel();
		getVersionCard().should('have.length', 2);
		closeVersionUpdatesPanel();
	});
});
