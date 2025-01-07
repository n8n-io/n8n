import planData from '../fixtures/Plan_data_opt_in_trial.json';
import {
	MainSidebar,
	WorkflowPage,
	visitPublicApiPage,
	getPublicApiUpgradeCTA,
} from '../pages';

const mainSidebar = new MainSidebar();
const workflowPage = new WorkflowPage();

describe('Cloud', () => {
	before(() => {
		const now = new Date();
		const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
		planData.expirationDate = fiveDaysFromNow.toJSON();
	});

	beforeEach(() => {
		cy.overrideSettings({
			deployment: { type: 'cloud' },
			n8nMetadata: { userId: '1' },
		});
		cy.intercept('GET', '/rest/admin/cloud-plan', planData).as('getPlanData');
		cy.intercept('GET', '/rest/cloud/proxy/user/me', {}).as('getCloudUserInfo');
		cy.intercept('GET', new RegExp('/rest/projects*')).as('projects');
		cy.intercept('GET', new RegExp('/rest/roles')).as('roles');
	});

	function visitWorkflowPage() {
		cy.visit(workflowPage.url);
		cy.wait('@getPlanData');
		cy.wait('@projects');
		cy.wait('@roles');
	}

	describe('BannerStack', () => {
		it('should render trial banner for opt-in cloud user', () => {
			visitWorkflowPage();

			cy.getByTestId('banner-stack').should('be.visible');

			mainSidebar.actions.signout();

			cy.getByTestId('banner-stack').should('not.be.visible');
		});
	});

	describe('Admin Home', () => {
		it('Should show admin button', () => {
			visitWorkflowPage();

			mainSidebar.getters.adminPanel().should('be.visible');
		});
	});

	describe('Public API', () => {
		it('Should show upgrade CTA for Public API if user is trialing', () => {
			visitPublicApiPage();
			cy.wait(['@loadSettings', '@projects', '@roles', '@getPlanData']);

			getPublicApiUpgradeCTA().should('be.visible');
		});
	});
});
