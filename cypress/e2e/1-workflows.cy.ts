import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { getUniqueWorkflowName } from '../utils/workflowUtils';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

const multipleWorkflowsCount = 5;

describe('Workflows', () => {
	beforeEach(() => {
		cy.visit(WorkflowsPage.url);
	});

	it('should create a new workflow using empty state card', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');

		WorkflowPage.getters.workflowTags().should('contain.text', 'some-tag-1');
		WorkflowPage.getters.workflowTags().should('contain.text', 'some-tag-2');
	});

	it('should create multiple new workflows using add workflow button', () => {
		[...Array(multipleWorkflowsCount).keys()].forEach(() => {
			cy.visit(WorkflowsPage.url);
			WorkflowsPage.getters.createWorkflowButton().click();

			cy.createFixtureWorkflow('Test_workflow_2.json', getUniqueWorkflowName('My New Workflow'));

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

	it('should respect tag querystring filter when listing workflows', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Test_workflow_2.json', getUniqueWorkflowName('My New Workflow'));

		cy.visit(WorkflowsPage.url);

		WorkflowsPage.getters.createWorkflowButton().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', 'Empty State Card Workflow');

		cy.visit(WorkflowsPage.url);

		WorkflowsPage.getters.workflowFilterButton().click();

		WorkflowsPage.getters.workflowTagsDropdown().click();

		WorkflowsPage.getters.workflowTagItem('some-tag-1').click();

		cy.reload();

		WorkflowsPage.getters.workflowCards().should('have.length', 1);
	});

	it('should preserve filters and pagination in URL', () => {
		// Add a search query
		WorkflowsPage.getters.searchBar().type('My');
		// Add a tag filter
		WorkflowsPage.getters.workflowFilterButton().click();
		WorkflowsPage.getters.workflowTagsDropdown().click();
		WorkflowsPage.getters.workflowTagItem('other-tag-1').click();
		WorkflowsPage.getters.workflowsListContainer().click();
		// Update sort order
		WorkflowsPage.getters.workflowSortDropdown().click();
		WorkflowsPage.getters.workflowSortItem('Sort by last created').click({ force: true });
		// Update page size
		WorkflowsPage.getters.workflowListPageSizeDropdown().click();
		WorkflowsPage.getters.workflowListPageSizeItem('25').click();

		// URL should contain all applied filters and pagination
		cy.url().should('include', 'search=My');
		// Cannot really know tag id, so just check if it contains 'tags='
		cy.url().should('include', 'tags=');
		cy.url().should('include', 'sort=lastCreated');
		cy.url().should('include', 'pageSize=25');

		// Reload the page
		cy.reload();
		// Check if filters and pagination are preserved
		WorkflowsPage.getters.searchBar().should('have.value', 'My');
		WorkflowsPage.getters.workflowFilterButton().click();
		WorkflowsPage.getters.workflowTagsDropdown().should('contain.text', 'other-tag-1');
		WorkflowsPage.getters
			.workflowSortItem('Sort by last created')
			.should('have.attr', 'aria-selected', 'true');
		WorkflowsPage.getters
			.workflowListPageSizeItem('25', false)
			.should('have.attr', 'aria-selected', 'true');
		// Aso, check if the URL is preserved
		cy.url().should('include', 'search=My');
		cy.url().should('include', 'tags=');
		cy.url().should('include', 'sort=lastCreated');
		cy.url().should('include', 'pageSize=25');
	});
});
