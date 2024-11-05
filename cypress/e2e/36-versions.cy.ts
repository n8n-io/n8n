import {
	closeVersionUpdatesPanel,
	getVersionCard,
	getVersionUpdatesPanelOpenButton,
	openVersionUpdatesPanel,
} from '../composables/versions';
import { WorkflowsPage } from '../pages/workflows';

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

		cy.visit(workflowsPage.url);
		cy.wait('@loadSettings');

		getVersionUpdatesPanelOpenButton().should('contain', '2 updates');
		openVersionUpdatesPanel();
		getVersionCard().should('have.length', 2);
		closeVersionUpdatesPanel();
	});
});
