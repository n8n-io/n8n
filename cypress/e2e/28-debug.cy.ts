import {
    HTTP_REQUEST_NODE_NAME,
    MANUAL_TRIGGER_NODE_NAME,
    SET_NODE_NAME,
} from '../constants';
import { WorkflowPage, NDV, WorkflowExecutionsTab } from '../pages';
import {getVisibleModalOverlay} from "../utils/modal";

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const executionsTab = new WorkflowExecutionsTab();

describe('Debug', () => {
    beforeEach(() => {
        workflowPage.actions.visit();
    });

    it('Should be able to debug executions', () => {
        cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');
        cy.intercept('GET', '/rest/executions/*').as('getExecution');
        cy.intercept('GET', '/rest/executions-current?filter=*').as('getCurrentExecutions');
        cy.intercept('POST', '/rest/workflows/run').as('postWorkflowRun');

        workflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
        workflowPage.actions.addNodeToCanvas(HTTP_REQUEST_NODE_NAME);
        workflowPage.actions.openNode(HTTP_REQUEST_NODE_NAME);
        ndv.actions.typeIntoParameterInput('url', 'https://foo.bar');
        ndv.actions.close();

        workflowPage.actions.addNodeToCanvas(SET_NODE_NAME, true);

        workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
        workflowPage.actions.executeWorkflow();

        cy.wait(['@postWorkflowRun']);

        executionsTab.actions.switchToExecutionsTab();

        cy.wait(['@getExecutions', '@getCurrentExecutions']);

        executionsTab.getters.executionDebugButton().should('have.text', 'Debug in editor').click();
        getVisibleModalOverlay().click(1, 1);

        executionsTab.actions.switchToEditorTab();

        workflowPage.actions.openNode(HTTP_REQUEST_NODE_NAME);
        ndv.actions.clearParameterInput('url');
        ndv.actions.typeIntoParameterInput('url', 'https://postman-echo.com/get?foo1=bar1&foo2=bar2');
        ndv.actions.close();

        workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
        workflowPage.actions.executeWorkflow();

        cy.wait(['@postWorkflowRun']);

        executionsTab.actions.switchToExecutionsTab();

        cy.wait(['@getExecutions', '@getCurrentExecutions']);

        executionsTab.getters.executionListItems().should('have.length', 2).first().click();
        cy.wait(['@getExecution']);

        executionsTab.getters.executionDebugButton().should('have.text', 'Copy to editor');

    });
});
