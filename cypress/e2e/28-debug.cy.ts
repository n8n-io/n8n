import {
	HTTP_REQUEST_NODE_NAME,
	IF_NODE_NAME,
	INSTANCE_OWNER,
	MANUAL_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
} from '../constants';
import { WorkflowPage, NDV, WorkflowExecutionsTab } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const executionsTab = new WorkflowExecutionsTab();

describe('Debug', () => {
	beforeEach(() => {
		cy.enableFeature('debugInEditor');
	});

	it('should be able to debug executions', () => {
		cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');
		cy.intercept('GET', '/rest/executions/*').as('getExecution');
		cy.intercept('POST', '/rest/workflows/**/run').as('postWorkflowRun');

		cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });

		workflowPage.actions.visit();

		workflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(HTTP_REQUEST_NODE_NAME);
		workflowPage.actions.openNode(HTTP_REQUEST_NODE_NAME);
		ndv.actions.typeIntoParameterInput('url', 'https://foo.bar');
		ndv.actions.close();

		workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true);

		workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		workflowPage.actions.executeWorkflow();

		cy.wait(['@postWorkflowRun']);

		executionsTab.actions.switchToExecutionsTab();

		cy.wait(['@getExecutions']);

		executionsTab.getters.executionDebugButton().should('have.text', 'Debug in editor').click();
		cy.url().should('include', '/debug');
		cy.get('.el-notification').contains('Execution data imported').should('be.visible');
		cy.get('.matching-pinned-nodes-confirmation').should('not.exist');

		workflowPage.actions.openNode(HTTP_REQUEST_NODE_NAME);
		ndv.actions.clearParameterInput('url');
		ndv.actions.typeIntoParameterInput('url', 'https://postman-echo.com/get?foo1=bar1&foo2=bar2');
		ndv.actions.close();

		workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		cy.url().should('not.include', '/debug');

		workflowPage.actions.executeWorkflow();

		cy.wait(['@postWorkflowRun']);

		workflowPage.actions.openNode(HTTP_REQUEST_NODE_NAME);
		ndv.actions.pinData();
		ndv.actions.close();

		executionsTab.actions.switchToExecutionsTab();

		cy.wait(['@getExecutions']);

		executionsTab.getters.executionListItems().should('have.length', 2).first().click();
		cy.wait(['@getExecution']);

		executionsTab.getters.executionDebugButton().should('have.text', 'Copy to editor').click();

		let confirmDialog = cy.get('.matching-pinned-nodes-confirmation').filter(':visible');
		confirmDialog.find('li').should('have.length', 2);
		confirmDialog.get('.btn--cancel').click();

		cy.wait(['@getExecutions']);

		executionsTab.getters.executionListItems().should('have.length', 2).first().click();
		cy.wait(['@getExecution']);

		executionsTab.getters.executionDebugButton().should('have.text', 'Copy to editor').click();

		confirmDialog = cy.get('.matching-pinned-nodes-confirmation').filter(':visible');
		confirmDialog.find('li').should('have.length', 2);
		confirmDialog.get('.btn--confirm').click();
		cy.url().should('include', '/debug');

		workflowPage.getters.canvasNodes().first().should('have.descendants', '.node-pin-data-icon');
		workflowPage.getters
			.canvasNodes()
			.not(':first')
			.should('not.have.descendants', '.node-pin-data-icon');

		cy.reload(true);
		cy.wait(['@getExecution']);

		confirmDialog = cy.get('.matching-pinned-nodes-confirmation').filter(':visible');
		confirmDialog.find('li').should('have.length', 1);
		confirmDialog.get('.btn--confirm').click();

		workflowPage.getters.canvasNodePlusEndpointByName(EDIT_FIELDS_SET_NODE_NAME).click();
		workflowPage.actions.addNodeToCanvas(IF_NODE_NAME, false);
		workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		cy.url().should('not.include', '/debug');

		executionsTab.actions.switchToExecutionsTab();
		cy.wait(['@getExecutions']);
		executionsTab.getters.executionDebugButton().should('have.text', 'Copy to editor').click();

		confirmDialog = cy.get('.matching-pinned-nodes-confirmation').filter(':visible');
		confirmDialog.find('li').should('have.length', 1);
		confirmDialog.get('.btn--confirm').click();
		cy.url().should('include', '/debug');

		workflowPage.getters.canvasNodes().last().find('.node-info-icon').should('be.empty');

		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.pinDataButton().click();
		ndv.actions.close();

		workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		cy.url().should('not.include', '/debug');

		workflowPage.actions.executeWorkflow();
		workflowPage.actions.zoomToFit();
		workflowPage.actions.deleteNode(IF_NODE_NAME);

		executionsTab.actions.switchToExecutionsTab();
		cy.wait(['@getExecutions']);
		executionsTab.getters.executionListItems().should('have.length', 3).first().click();
		cy.wait(['@getExecution']);
		executionsTab.getters.executionDebugButton().should('have.text', 'Copy to editor').click();
		cy.get('.el-notification').contains("Some execution data wasn't imported").should('be.visible');
		cy.url().should('include', '/debug');
	});
});
