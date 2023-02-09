import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { NDV, SettingsCommunityNodes, WorkflowPage, WorkflowsPage } from '../pages';

const settingsCommunityNodes = new SettingsCommunityNodes();
const communityNodeRepo = 'n8n-nodes-debughelper';

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Community Node', async () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	it('should not show up for no user setup', () => {
		cy.visit(settingsCommunityNodes.settingsUrl);
		settingsCommunityNodes.getters.communityInstallSidebarEntry().should('not.exist');
	});

	it('should be installable from repo', () => {
		cy.setup({ email, firstName: 'test', lastName: 'test', password });
		cy.visit(settingsCommunityNodes.url);
		settingsCommunityNodes.actions.clickInstallCommunityNodeButton();
		settingsCommunityNodes.getters.communityInstallModal().should('be.visible');
		settingsCommunityNodes.getters.communityInstallModalButton().should('be.disabled');

		settingsCommunityNodes.actions.enterInstallCommunityNodeName(communityNodeRepo);
		settingsCommunityNodes.getters.communityInstallModalButton().should('be.disabled');

		settingsCommunityNodes.actions.clickCommunityInstallModalCheckbox();
		settingsCommunityNodes.getters.communityInstallModalButton().should('not.be.disabled');

		settingsCommunityNodes.actions.clickCommunityInstallModalButton();
	});
});
