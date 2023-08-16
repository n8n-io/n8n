import { BannerStack, MainSidebar, SigninPage, WorkflowPage } from '../pages';
import planData from '../fixtures/Plan_data_opt_in_trial.json';
import { INSTANCE_OWNER, BACKEND_BASE_URL } from '../constants';

const mainSidebar = new MainSidebar();
const bannerStack = new BannerStack();
const signinPage = new SigninPage();
const workflowPage = new WorkflowPage();

describe('BannerStack', { disableAutoLogin: true }, () => {
	before(() => {
		const now = new Date();
		const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
		planData.expirationDate = fiveDaysFromNow.toJSON();
	});

	beforeEach(() => {
		Cypress.session.clearAllSavedSessions();
		cy.request('POST', `${BACKEND_BASE_URL}/rest/e2e/reset`, {
			owner: INSTANCE_OWNER,
			members: [],
		});
	});

	it('should render trial banner for opt-in cloud user', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'cloud' }, n8nMetadata: { userId: 1 } },
				});
			});
		}).as('loadSettings');

		cy.intercept('GET', '/rest/admin/cloud-plan', {
			body: planData,
		}).as('getPlanData');

		signinPage.actions.loginWithEmailAndPassword(INSTANCE_OWNER.email, INSTANCE_OWNER.password);

		cy.visit(workflowPage.url);

		cy.wait('@getPlanData');

		bannerStack.getters.banner().should('be.visible');

		mainSidebar.actions.signout();

		bannerStack.getters.banner().should('not.be.visible');

		signinPage.actions.loginWithEmailAndPassword(INSTANCE_OWNER.email, INSTANCE_OWNER.password);

		cy.visit(signinPage.url);

		bannerStack.getters.banner().should('be.visible');

		mainSidebar.actions.signout();
	});

	it('should not render opt-in-trial banner for non cloud deployment', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'default' } },
				});
			});
		}).as('loadSettings');

		signinPage.actions.loginWithEmailAndPassword(INSTANCE_OWNER.email, INSTANCE_OWNER.password);

		cy.visit(workflowPage.url);

		bannerStack.getters.banner().should('not.be.visible');

		mainSidebar.actions.signout();
	});
});
