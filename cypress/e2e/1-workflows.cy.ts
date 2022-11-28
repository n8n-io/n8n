import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from "../constants";
import { randFirstName, randLastName } from "@ngneat/falso";
import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { v4 as uuid } from 'uuid';

const username = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('Workflows', () => {
	beforeEach(() => {
		cy.signup(username, firstName, lastName, password);

		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		})

		cy.signin(username, password);
		cy.visit(WorkflowsPage.url);
	});

	it('should create a new workflow using empty state card', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Test_workflow_1.json', `Empty State Card Workflow ${uuid()}`);

		WorkflowPage.getters.workflowTags().should('contain.text', 'some-tag-1');
		WorkflowPage.getters.workflowTags().should('contain.text', 'some-tag-2');
	})

	it('should create a new workflow using add workflow button', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('not.exist');
		WorkflowsPage.getters.createWorkflowButton().click();

		cy.createFixtureWorkflow('Test_workflow_2.json', `Add Workflow Button Workflow ${uuid()}`);

		WorkflowPage.getters.workflowTags().should('contain.text', 'other-tag-1');
		WorkflowPage.getters.workflowTags().should('contain.text', 'other-tag-2');
	})

	it('should search for a workflow', () => {
		WorkflowsPage.getters.searchBar().type('Empty State Card Workflow');

		WorkflowsPage.getters.workflowCards().should('have.length', 1);
		WorkflowsPage.getters.workflowCard('Empty State Card Workflow').should('contain.text', 'Empty State Card Workflow');

		WorkflowsPage.getters.searchBar().clear().type('Add Workflow Button Workflow');

		WorkflowsPage.getters.workflowCards().should('have.length', 1);
		WorkflowsPage.getters.workflowCard('Add Workflow Button Workflow').should('contain.text', 'Add Workflow Button Workflow');

		WorkflowsPage.getters.searchBar().clear().type('Some non-existent workflow');
		WorkflowsPage.getters.workflowCards().should('not.exist');

		cy.contains('No workflows found').should('be.visible');
	})

	it('should delete all the workflows', () => {
		WorkflowsPage.getters.workflowCards().should('have.length', 2);

		WorkflowsPage.getters.workflowCards().each(($el) => {
			const workflowName = $el.find('[data-test-id="workflow-card-name"]').text();

			WorkflowsPage.getters.workflowCardActions(workflowName).click();
			WorkflowsPage.getters.workflowDeleteButton().click();

			cy.get('button').contains('delete').click();
		})

		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowTemplateCard().should('be.visible');
	})

	it('should contain empty state cards', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowTemplateCard().should('be.visible');
	});

});
