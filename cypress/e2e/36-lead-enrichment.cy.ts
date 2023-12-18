import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowsListPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('Lead Enrichment - Should render', () => {

	beforeEach(() => {
		localStorage.removeItem('SHOW_N8N_LEAD_ENRICHMENT_SUGGESTIONS');
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'cloud' } },
				});
			});
		}).as('loadSettings');
		cy.intercept('GET', '/rest/cloud/proxy/templates', {
			fixture: 'Lead_Enrichment_Templates.json',
		});
		cy.visit(WorkflowsListPage.url);
		cy.wait('@loadSettings');
	});

	it('should render lead enrichment page in empty workflow list', () => {
		WorkflowsListPage.getters.leadEnrichmentPageContainer().should('exist');
		WorkflowsListPage.getters.leadEnrichmentCards().should('have.length', 4);
	});

	it('should render lead enrichment when there are workflows in the list', () => {
		WorkflowsListPage.getters.leadEnrichmentNewWorkflowButton().click();
		cy.createFixtureWorkflow('Test_workflow_1.json', 'Test Workflow');
		cy.visit(WorkflowsListPage.url);
		WorkflowsListPage.getters.leadEnrichmentSectionContainer().should('exist');
		WorkflowsListPage.getters.leadEnrichmentCards().should('have.length', 4);
	});

	it('should enable users to signup for lead enrichment templates', () => {
		// Test the whole flow
		WorkflowsListPage.getters.leadEnrichmentCards().first().click();
		WorkflowsListPage.getters.leadEnrichmentPreviewModal().should('exist');
		WorkflowsListPage.getters.leadEnrichmentUseTemplateButton().click();
		cy.url().should('include', '/workflow/new');
		WorkflowPage.getters.infoToast().should('contain', 'Template coming soon!');
		WorkflowPage.getters.infoToast().contains('Notify me when it\'s available').click();
		WorkflowPage.getters.successToast().should('contain', 'We will contact you via email once this template is released.');
		cy.visit(WorkflowsListPage.url);
		// Once users have signed up for a template, suggestions should not be shown again
		WorkflowsListPage.getters.leadEnrichmentSectionContainer().should('not.exist');
	});

});

describe('Lead Enrichment - Should not render', () => {
	beforeEach(() => {
		localStorage.removeItem('SHOW_N8N_LEAD_ENRICHMENT_SUGGESTIONS');
		cy.visit(WorkflowsListPage.url);
	});

	it('should not render lead enrichment templates if not in cloud deployment', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'notCloud' } },
				});
			});
		});
		WorkflowsListPage.getters.leadEnrichmentPageContainer().should('not.exist');
		WorkflowsListPage.getters.leadEnrichmentSectionContainer().should('not.exist');
	});

	it('should not render lead enrichment templates if endpoint throws error', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'cloud' } },
				});
			});
		});
		cy.intercept('GET', '/rest/cloud/proxy/templates', { statusCode: 500 }).as('loadTemplates');
		WorkflowsListPage.getters.leadEnrichmentPageContainer().should('not.exist');
		WorkflowsListPage.getters.leadEnrichmentSectionContainer().should('not.exist');
	});

	it('should not render lead enrichment templates if endpoint returns empty list', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'cloud' } },
				});
			});
		});
		cy.intercept('GET', '/rest/cloud/proxy/templates', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { collections: [] },
				});
			});
		});
		WorkflowsListPage.getters.leadEnrichmentPageContainer().should('not.exist');
		WorkflowsListPage.getters.leadEnrichmentSectionContainer().should('not.exist');
	});

	it('should not render lead enrichment templates if endpoint returns invalid response', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'cloud' } },
				});
			});
		});
		cy.intercept('GET', '/rest/cloud/proxy/templates', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { somethingElse: [] },
				});
			});
		});
		WorkflowsListPage.getters.leadEnrichmentPageContainer().should('not.exist');
		WorkflowsListPage.getters.leadEnrichmentSectionContainer().should('not.exist');
	});
});
