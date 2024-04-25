import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

type SuggestedTemplatesStub = {
	sections: SuggestedTemplatesSectionStub[];
}

type SuggestedTemplatesSectionStub = {
	name: string;
	title: string;
	description: string;
	workflows: Array<Object>;
};

const WorkflowsListPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

let fixtureSections: SuggestedTemplatesStub = { sections: [] };;

describe('Suggested templates - Should render', () => {

	before(() => {
		cy.fixture('Suggested_Templates.json').then((data) => {
			fixtureSections = data;
		});
	});

	beforeEach(() => {
		localStorage.removeItem('SHOW_N8N_SUGGESTED_TEMPLATES');
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'cloud' } },
				});
			});
		}).as('loadSettings');
		cy.intercept('GET', '/rest/cloud/proxy/templates', {
			fixture: 'Suggested_Templates.json',
		});
		cy.visit(WorkflowsListPage.url);
		cy.wait('@loadSettings');
	});

	it('should render suggested templates page in empty workflow list', () => {
		WorkflowsListPage.getters.suggestedTemplatesPageContainer().should('exist');
		WorkflowsListPage.getters.suggestedTemplatesCards().should('have.length', fixtureSections.sections[0].workflows.length);
		WorkflowsListPage.getters.suggestedTemplatesSectionDescription().should('contain', fixtureSections.sections[0].description);
	});

	it('should render suggested templates when there are workflows in the list', () => {
		WorkflowsListPage.getters.suggestedTemplatesNewWorkflowButton().click();
		cy.createFixtureWorkflow('Test_workflow_1.json', 'Test workflow');
		cy.visit(WorkflowsListPage.url);
		WorkflowsListPage.getters.suggestedTemplatesSectionContainer().should('exist');
		cy.contains(`Explore ${fixtureSections.sections[0].name.toLocaleLowerCase()} workflow templates`).should('exist');
		WorkflowsListPage.getters.suggestedTemplatesCards().should('have.length', fixtureSections.sections[0].workflows.length);
	});

	it('should enable users to signup for suggested templates templates', () => {
		// Test the whole flow
		WorkflowsListPage.getters.suggestedTemplatesCards().first().click();
		WorkflowsListPage.getters.suggestedTemplatesPreviewModal().should('exist');
		WorkflowsListPage.getters.suggestedTemplatesUseTemplateButton().click();
		cy.url().should('include', '/workflow/new');
		WorkflowPage.getters.infoToast().should('contain', 'Template coming soon!');
		WorkflowPage.getters.infoToast().contains('Notify me when it\'s available').click();
		WorkflowPage.getters.successToast().should('contain', 'We will contact you via email once this template is released.');
		cy.visit(WorkflowsListPage.url);
		// Once users have signed up for a template, suggestions should not be shown again
		WorkflowsListPage.getters.suggestedTemplatesSectionContainer().should('not.exist');
	});

});

describe('Suggested templates - Should not render', () => {
	beforeEach(() => {
		localStorage.removeItem('SHOW_N8N_SUGGESTED_TEMPLATES');
		cy.visit(WorkflowsListPage.url);
	});

	it('should not render suggested templates templates if not in cloud deployment', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'notCloud' } },
				});
			});
		});
		WorkflowsListPage.getters.suggestedTemplatesPageContainer().should('not.exist');
		WorkflowsListPage.getters.suggestedTemplatesSectionContainer().should('not.exist');
	});

	it('should not render suggested templates templates if endpoint throws error', () => {
		cy.intercept('GET', '/rest/settings', (req) => {
			req.on('response', (res) => {
				res.send({
					data: { ...res.body.data, deployment: { type: 'cloud' } },
				});
			});
		});
		cy.intercept('GET', '/rest/cloud/proxy/templates', { statusCode: 500 }).as('loadTemplates');
		WorkflowsListPage.getters.suggestedTemplatesPageContainer().should('not.exist');
		WorkflowsListPage.getters.suggestedTemplatesSectionContainer().should('not.exist');
	});

	it('should not render suggested templates templates if endpoint returns empty list', () => {
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
		WorkflowsListPage.getters.suggestedTemplatesPageContainer().should('not.exist');
		WorkflowsListPage.getters.suggestedTemplatesSectionContainer().should('not.exist');
	});

	it('should not render suggested templates templates if endpoint returns invalid response', () => {
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
		WorkflowsListPage.getters.suggestedTemplatesPageContainer().should('not.exist');
		WorkflowsListPage.getters.suggestedTemplatesSectionContainer().should('not.exist');
	});
});
