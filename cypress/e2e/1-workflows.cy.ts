import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { v4 as uuid } from 'uuid';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

const multipleWorkflowsCount = 5;

describe('Workflows', () => {
	before(() => {
		cy.skipSetup();
	});

	beforeEach(() => {
		cy.visit(WorkflowsPage.url);
	});

	it('should create a new workflow using empty state card', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', `Empty State Card Workflow ${uuid()}`);

		WorkflowPage.getters.workflowTags().should('contain.text', 'some-tag-1');
		WorkflowPage.getters.workflowTags().should('contain.text', 'some-tag-2');
	});

	it('should create multiple new workflows using add workflow button', () => {
		[...Array(multipleWorkflowsCount).keys()].forEach(() => {
			cy.visit(WorkflowsPage.url);
			WorkflowsPage.getters.createWorkflowButton().click();

			cy.createFixtureWorkflow('Test_workflow_2.json', `My New Workflow ${uuid()}`);

			WorkflowPage.getters.workflowTags().should('contain.text', 'other-tag-1');
			WorkflowPage.getters.workflowTags().should('contain.text', 'other-tag-2');
		});
	});

	it('should search for a workflow', () => {
		// One Result
		WorkflowsPage.getters.searchBar().type('Empty State Card Workflow');
		WorkflowsPage.getters.workflowCards().should('have.length', 1);
		WorkflowsPage.getters
			.workflowCard('Empty State Card Workflow')
			.should('contain.text', 'Empty State Card Workflow');

		// Multiple Results
		WorkflowsPage.getters.searchBar().clear().type('My New Workflow');
		WorkflowsPage.getters.workflowCards().should('have.length', multipleWorkflowsCount);
		WorkflowsPage.getters.workflowCard('My New Workflow').should('contain.text', 'My New Workflow');

		// All Results
		WorkflowsPage.getters.searchBar().clear().type('Workflow');
		WorkflowsPage.getters.workflowCards().should('have.length', multipleWorkflowsCount + 1);
		WorkflowsPage.getters.workflowCard('Workflow').should('contain.text', 'Workflow');

		// No Results
		WorkflowsPage.getters.searchBar().clear().type('Some non-existent workflow');
		WorkflowsPage.getters.workflowCards().should('not.exist');

		cy.contains('No workflows found').should('be.visible');
	});

	it('should delete all the workflows', () => {
		WorkflowsPage.getters.workflowCards().should('have.length', multipleWorkflowsCount + 1);

		WorkflowsPage.getters.workflowCards().each(($el) => {
			const workflowName = $el.find('[data-test-id="workflow-card-name"]').text();

			WorkflowsPage.getters.workflowCardActions(workflowName).click();
			WorkflowsPage.getters.workflowDeleteButton().click();

			cy.get('button').contains('delete').click();
		});

		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
	});
});
