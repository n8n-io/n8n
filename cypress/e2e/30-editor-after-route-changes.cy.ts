import {
    CODE_NODE_NAME,
    EDIT_FIELDS_SET_NODE_NAME,
    IF_NODE_NAME,
    INSTANCE_OWNER,
    SCHEDULE_TRIGGER_NODE_NAME
} from "../constants";
import { WorkflowExecutionsTab, WorkflowPage as WorkflowPageClass, WorkflowHistoryPage } from "../pages";

const workflowPage = new WorkflowPageClass();
const executionsTab = new WorkflowExecutionsTab();
const workflowHistoryPage = new WorkflowHistoryPage();

const createNewWorkflowAndActivate = () => {
    workflowPage.actions.visit();
    workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
    workflowPage.actions.saveWorkflowOnButtonClick();
    workflowPage.actions.activateWorkflow();
}

const editWorkflowAndDeactivate = () => {
    workflowPage.getters.canvasNodePlusEndpointByName(SCHEDULE_TRIGGER_NODE_NAME).click();
    workflowPage.getters.nodeCreatorSearchBar().should('be.visible');
    workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, false);
    cy.get('.jtk-connector').should('have.length', 1);
    workflowPage.actions.saveWorkflowOnButtonClick();
    workflowPage.getters.activatorSwitch().click();
    workflowPage.actions.zoomToFit();
}

const editWorkflowMoreAndActivate = () => {
    cy.drag(
        workflowPage.getters.getEndpointSelector('plus', EDIT_FIELDS_SET_NODE_NAME),
        [200, 200],
        {
            realMouse: true,
        }
    );
    workflowPage.getters.nodeCreatorSearchBar().should('be.visible');

    workflowPage.actions.addNodeToCanvas(CODE_NODE_NAME, false);
    workflowPage.getters.nodeViewBackground().click(600, 200, { force: true });
    cy.get('.jtk-connector').should('have.length', 2);
    workflowPage.actions.zoomToFit();
    workflowPage.actions.saveWorkflowOnButtonClick();

    workflowPage.actions.addNodeToCanvas(IF_NODE_NAME);
    workflowPage.getters.nodeViewBackground().click(600, 200, { force: true });
    cy.get('.jtk-connector').should('have.length', 2);

    workflowPage.getters.canvasNodeByName(IF_NODE_NAME).click();
    cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', [50, 200], { clickToFinish: true });
    workflowPage.getters
        .canvasNodes()
        .last()
        .should('have.attr', 'style', 'left: 860px; top: 440px;');

    cy.draganddrop(
        workflowPage.getters.getEndpointSelector('output', CODE_NODE_NAME),
        workflowPage.getters.getEndpointSelector('input', IF_NODE_NAME),
    );
    cy.get('.jtk-connector').should('have.length', 3);

}

describe('Editor actions should work', () => {
	beforeEach(() => {
			  cy.enableFeature('debugInEditor');
			  cy.enableFeature('workflowHistory');
        cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });
        createNewWorkflowAndActivate();
    });

    it('after saving a new workflow', () => {
        editWorkflowAndDeactivate();
        editWorkflowMoreAndActivate();
    });

    it('after switching between Editor and Executions', () => {
        cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');
        cy.intercept('GET', '/rest/executions-current?filter=*').as('getCurrentExecutions');

        executionsTab.actions.switchToExecutionsTab();
        cy.wait(['@getExecutions', '@getCurrentExecutions']);
        cy.wait(500);
        executionsTab.actions.switchToEditorTab();
        editWorkflowAndDeactivate();
        editWorkflowMoreAndActivate();
    });

    it('after switching between Editor and Debug', () => {
        cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');
        cy.intercept('GET', '/rest/executions/*').as('getExecution');
        cy.intercept('GET', '/rest/executions-current?filter=*').as('getCurrentExecutions');
        cy.intercept('POST', '/rest/workflows/run').as('postWorkflowRun');

        editWorkflowAndDeactivate();
        workflowPage.actions.executeWorkflow();
        cy.wait(['@postWorkflowRun']);

        executionsTab.actions.switchToExecutionsTab();
        cy.wait(['@getExecutions', '@getCurrentExecutions']);

        executionsTab.getters.executionListItems().should('have.length', 1).first().click();
        cy.wait(['@getExecution']);

        executionsTab.getters.executionDebugButton().should('have.text', 'Copy to editor').click();
			  editWorkflowMoreAndActivate();
    });

    it('after switching between Editor and Workflow history', () => {
        cy.intercept('GET', '/rest/workflow-history/workflow/*/version/*').as('getVersion');
        cy.intercept('GET', '/rest/workflow-history/workflow/*').as('getHistory');

        editWorkflowAndDeactivate();
        workflowPage.getters.workflowHistoryButton().click();
        cy.wait(['@getHistory']);
        cy.wait(['@getVersion']);

        cy.intercept('GET', '/rest/workflows/*').as('workflowGet');
        workflowHistoryPage.getters.workflowHistoryCloseButton().click();
        cy.wait(['@workflowGet']);
				cy.wait(1000);

        editWorkflowMoreAndActivate();
		});
});
