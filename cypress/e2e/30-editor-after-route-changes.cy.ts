import { getWorkflowHistoryCloseButton } from '../composables/workflow';
import { WorkflowPage as WorkflowPageClass } from '../pages';

const workflowPage = new WorkflowPageClass();

const switchBetweenEditorAndHistory = () => {
	workflowPage.getters.workflowHistoryButton().click();
	cy.wait(['@getHistory']);
	cy.wait(['@getVersion']);

	cy.intercept('GET', '/rest/workflows/*').as('workflowGet');
	getWorkflowHistoryCloseButton().click();
	cy.wait(['@workflowGet']);
	cy.wait(1000);

	workflowPage.getters.canvasNodes().first().should('be.visible');
	workflowPage.getters.canvasNodes().last().should('be.visible');
};

const switchBetweenEditorAndWorkflowlist = () => {
	cy.getByTestId('menu-item').first().click();
	cy.wait(['@getUsers', '@getWorkflows', '@getActiveWorkflows', '@getProjects']);

	cy.getByTestId('resources-list-item-workflow').first().click();

	workflowPage.getters.canvasNodes().first().should('be.visible');
	workflowPage.getters.canvasNodes().last().should('be.visible');
};

const zoomInAndCheckNodes = () => {
	cy.getByTestId('zoom-in-button').click();
	cy.getByTestId('zoom-in-button').click();
	cy.getByTestId('zoom-in-button').click();
	cy.getByTestId('zoom-in-button').click();

	workflowPage.getters.canvasNodes().first().should('not.be.visible');
	workflowPage.getters.canvasNodes().last().should('not.be.visible');
};

describe('Editor zoom should work after route changes', () => {
	beforeEach(() => {
		cy.enableFeature('debugInEditor');
		cy.enableFeature('workflowHistory');
		cy.signinAsOwner();
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('Lots_of_nodes.json', 'Lots of nodes');
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('after switching between Editor and Workflow history and Workflow list', () => {
		cy.intercept('GET', '/rest/workflow-history/workflow/*/version/*').as('getVersion');
		cy.intercept('GET', '/rest/workflow-history/workflow/*').as('getHistory');
		cy.intercept('GET', '/rest/users?*').as('getUsers');
		cy.intercept('GET', '/rest/workflows?*').as('getWorkflows');
		cy.intercept('GET', '/rest/active-workflows').as('getActiveWorkflows');
		cy.intercept('GET', '/rest/projects').as('getProjects');

		switchBetweenEditorAndHistory();
		zoomInAndCheckNodes();
		switchBetweenEditorAndHistory();
		switchBetweenEditorAndHistory();
		zoomInAndCheckNodes();
		switchBetweenEditorAndWorkflowlist();
		zoomInAndCheckNodes();
		switchBetweenEditorAndWorkflowlist();
		switchBetweenEditorAndWorkflowlist();
		zoomInAndCheckNodes();
		switchBetweenEditorAndHistory();
		switchBetweenEditorAndWorkflowlist();
	});
});
