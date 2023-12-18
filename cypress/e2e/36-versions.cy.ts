import { INSTANCE_OWNER } from '../constants';
import { WorkflowsPage } from '../pages/workflows';
import {
	closeVersionUpdatesPanel,
	getVersionCard,
	openVersionUpdatesPanel,
} from '../composables/versions';

const workflowsPage = new WorkflowsPage();

describe('Versions', () => {
	it('should open updates panel', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.continue((res) => {
				if (res.body.hasOwnProperty('data')) {
					res.body.data = {
						...res.body.data,
						releaseChannel: 'stable',
						versionCli: '1.0.0',
						versionNotifications: {
							enabled: true,
							endpoint: 'https://api.n8n.io/api/versions/',
							infoUrl: 'https://docs.n8n.io/getting-started/installation/updating.html',
						},
					};
				}
			});
		}).as('settings');
		cy.signin(INSTANCE_OWNER);

		cy.visit(workflowsPage.url);
		cy.wait('@settings');

		openVersionUpdatesPanel();
		getVersionCard().should('have.length.greaterThan', 10);
		closeVersionUpdatesPanel();
	});
});
