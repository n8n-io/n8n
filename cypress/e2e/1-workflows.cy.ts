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

describe('Workflows flow', () => {
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
		WorkflowsPage.get('newWorkflowButtonCard').should('be.visible');
		WorkflowsPage.get('newWorkflowButtonCard').click();

		cy.createFixtureWorkflow('Test_workflow_1.json', `Empty State Card Workflow ${uuid()}`);

		WorkflowPage.get('workflowTags').should('contain.text', 'some-tag-1');
		WorkflowPage.get('workflowTags').should('contain.text', 'some-tag-2');
	})

	it('should create a new workflow using add workflow button', () => {
		WorkflowsPage.get('newWorkflowButtonCard').should('not.exist');
		WorkflowsPage.get('createWorkflowButton').click();

		cy.createFixtureWorkflow('Test_workflow_2.json', `Add Workflow Button Workflow ${uuid()}`);

		WorkflowPage.get('workflowTags').should('contain.text', 'other-tag-1');
		WorkflowPage.get('workflowTags').should('contain.text', 'other-tag-2');
	})

	it('should search for a workflow', () => {
		WorkflowsPage.get('searchBar').type('Empty State Card Workflow');

		WorkflowsPage.get('workflowCards').should('have.length', 1);
		WorkflowsPage.get('workflowCard', 'Empty State Card Workflow').should('contain.text', 'Empty State Card Workflow');

		WorkflowsPage.get('searchBar').clear().type('Add Workflow Button Workflow');

		WorkflowsPage.get('workflowCards').should('have.length', 1);
		WorkflowsPage.get('workflowCard', 'Add Workflow Button Workflow').should('contain.text', 'Add Workflow Button Workflow');

		WorkflowsPage.get('searchBar').clear().type('Some non-existent workflow');
		WorkflowsPage.get('workflowCards').should('not.exist');
		cy.contains('No workflows found').should('be.visible');
	})

	it('should delete all the workflows', () => {
		WorkflowsPage.get('workflowCards').should('have.length', 2);

		WorkflowsPage.get('workflowCards').each(($el) => {
			const workflowName = $el.find('[data-test-id="workflow-card-name"]').text();

			WorkflowsPage.get('workflowCardActions', workflowName).click();
			WorkflowsPage.get('workflowDeleteButton').click();
			cy.get('button').contains('delete').click();
		})

		WorkflowsPage.get('newWorkflowButtonCard').should('be.visible');
		WorkflowsPage.get('newWorkflowTemplateCard').should('be.visible');
	})

	it('should contain empty state cards', () => {
		WorkflowsPage.get('newWorkflowButtonCard').should('be.visible');
		WorkflowsPage.get('newWorkflowTemplateCard').should('be.visible');
	});

});
