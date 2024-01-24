import {
	BannerStack,
	MainSidebar,
	WorkflowPage,
	visitPublicApiPage,
	getPublicApiUpgradeCTA,
} from '../pages';
import planData from '../fixtures/Plan_data_opt_in_trial.json';
import { INSTANCE_OWNER } from '../constants';

const mainSidebar = new MainSidebar();
const bannerStack = new BannerStack();
const workflowPage = new WorkflowPage();

describe('Cloud', { disableAutoLogin: true }, () => {
	before(() => {
		const now = new Date();
		const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
		planData.expirationDate = fiveDaysFromNow.toJSON();
	});

	describe('BannerStack', () => {
		it('should render trial banner for opt-in cloud user', () => {
			cy.intercept('GET', '/rest/admin/cloud-plan', {
				body: planData,
			}).as('getPlanData');

			cy.intercept('GET', '/rest/settings', (req) => {
				req.on('response', (res) => {
					res.send({
						data: { ...res.body.data, deployment: { type: 'cloud' }, n8nMetadata: { userId: 1 } },
					});
				});
			}).as('loadSettings');

			cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });

			cy.visit(workflowPage.url);

			cy.wait('@getPlanData');

			bannerStack.getters.banner().should('be.visible');

			mainSidebar.actions.signout();

			bannerStack.getters.banner().should('not.be.visible');

			cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });

			cy.visit(workflowPage.url);

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

			cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });

			cy.visit(workflowPage.url);

			bannerStack.getters.banner().should('not.be.visible');

			mainSidebar.actions.signout();
		});
	});

	describe('Admin Home', () => {
		it('Should show admin button', () => {
			cy.intercept('GET', '/rest/settings', (req) => {
				req.on('response', (res) => {
					res.send({
						data: { ...res.body.data, deployment: { type: 'cloud' }, n8nMetadata: { userId: 1 } },
					});
				});
			}).as('loadSettings');

			cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });

			cy.visit(workflowPage.url);

			mainSidebar.getters.adminPanel().should('be.visible');
		});
	});

	describe('Public API', () => {
		it('Should show upgrade CTA for Public API if user is trialing', () => {
			cy.intercept('GET', '/rest/admin/cloud-plan', {
				body: planData,
			}).as('getPlanData');

			cy.intercept('GET', '/rest/settings', (req) => {
				req.on('response', (res) => {
					res.send({
						data: {
							...res.body.data,
							deployment: { type: 'cloud' },
							n8nMetadata: { userId: 1 },
						},
					});
				});
			}).as('loadSettings');

			cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });

			visitPublicApiPage();

			getPublicApiUpgradeCTA().should('be.visible');
		});
	});
});
