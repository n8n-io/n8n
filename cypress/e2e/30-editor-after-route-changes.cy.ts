import {
	CODE_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	IF_NODE_NAME,
	INSTANCE_OWNER,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../constants';
import {
	WorkflowExecutionsTab,
	WorkflowPage as WorkflowPageClass,
	WorkflowHistoryPage,
} from '../pages';

const workflowPage = new WorkflowPageClass();
const executionsTab = new WorkflowExecutionsTab();
const workflowHistoryPage = new WorkflowHistoryPage();

const createNewWorkflowAndActivate = () => {
	workflowPage.actions.visit();
	workflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
	workflowPage.actions.saveWorkflowOnButtonClick();
	workflowPage.actions.activateWorkflow();
	cy.get('.el-notification .el-notification--error').should('not.exist');
};

const editWorkflowAndDeactivate = () => {
	workflowPage.getters.canvasNodePlusEndpointByName(SCHEDULE_TRIGGER_NODE_NAME).click();
	workflowPage.getters.nodeCreatorSearchBar().should('be.visible');
	workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, false);
	cy.get('.jtk-connector').should('have.length', 1);
	workflowPage.actions.saveWorkflowOnButtonClick();
	workflowPage.getters.activatorSwitch().click();
	workflowPage.actions.zoomToFit();
	cy.get('.el-notification .el-notification--error').should('not.exist');
};

const editWorkflowMoreAndActivate = () => {
	cy.drag(workflowPage.getters.getEndpointSelector('plus', EDIT_FIELDS_SET_NODE_NAME), [200, 200], {
		realMouse: true,
	});
	workflowPage.getters.nodeCreatorSearchBar().should('be.visible');

	workflowPage.actions.addNodeToCanvas(CODE_NODE_NAME, false);
	workflowPage.getters.nodeViewBackground().click(600, 200, { force: true });
	cy.get('.jtk-connector').should('have.length', 2);
	workflowPage.actions.zoomToFit();
	workflowPage.actions.saveWorkflowOnButtonClick();

	workflowPage.actions.addNodeToCanvas(IF_NODE_NAME);
	workflowPage.getters.nodeViewBackground().click(600, 200, { force: true });
	cy.get('.jtk-connector').should('have.length', 2);

	const position = {
		top: 0,
		left: 0,
	};
	workflowPage.getters
		.canvasNodeByName(IF_NODE_NAME)
		.click()
		.then(($element) => {
			position.top = $element.position().top;
			position.left = $element.position().left;
		});

	cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', [50, 200], { clickToFinish: true });
	workflowPage.getters
		.canvasNodes()
		.last()
		.then(($element) => {
			const finalPosition = {
				top: $element.position().top,
				left: $element.position().left,
			};

			expect(finalPosition.top).to.be.greaterThan(position.top);
			expect(finalPosition.left).to.be.greaterThan(position.left);
		});

	cy.draganddrop(
		workflowPage.getters.getEndpointSelector('output', CODE_NODE_NAME),
		workflowPage.getters.getEndpointSelector('input', IF_NODE_NAME),
	);
	cy.get('.jtk-connector').should('have.length', 3);

	workflowPage.actions.saveWorkflowOnButtonClick();
	workflowPage.getters.activatorSwitch().click();
	cy.get('.el-notification .el-notification--error').should('not.exist');
};

const switchBetweenEditorAndHistory = () => {
	workflowPage.getters.workflowHistoryButton().click();
	cy.wait(['@getHistory']);
	cy.wait(['@getVersion']);

	cy.intercept('GET', '/rest/workflows/*').as('workflowGet');
	workflowHistoryPage.getters.workflowHistoryCloseButton().click();
	cy.wait(['@workflowGet']);
	cy.wait(1000);

	workflowPage.getters.canvasNodes().first().should('be.visible');
	workflowPage.getters.canvasNodes().last().should('be.visible');
};

const switchBetweenEditorAndWorkflowlist = () => {
	cy.getByTestId('menu-item').first().click();
	cy.wait(['@getUsers', '@getWorkflows', '@getActiveWorkflows', '@getCredentials']);

	cy.getByTestId('resources-list-item').first().click();

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

		executionsTab.actions.switchToExecutionsTab();
		cy.wait(['@getExecutions']);
		cy.wait(500);
		executionsTab.actions.switchToEditorTab();
		editWorkflowAndDeactivate();
		editWorkflowMoreAndActivate();
	});

	it('after switching between Editor and Debug', () => {
		cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');
		cy.intercept('GET', '/rest/executions/*').as('getExecution');
		cy.intercept('POST', '/rest/workflows/**/run').as('postWorkflowRun');

		editWorkflowAndDeactivate();
		workflowPage.actions.executeWorkflow();
		cy.wait(['@postWorkflowRun']);

		executionsTab.actions.switchToExecutionsTab();
		cy.wait(['@getExecutions']);

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

describe('Editor zoom should work after route changes', () => {
	beforeEach(() => {
		cy.enableFeature('debugInEditor');
		cy.enableFeature('workflowHistory');
		cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('Lots_of_nodes.json', `Lots of nodes`);
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('after switching between Editor and Workflow history and Workflow list', () => {
		cy.intercept('GET', '/rest/workflow-history/workflow/*/version/*').as('getVersion');
		cy.intercept('GET', '/rest/workflow-history/workflow/*').as('getHistory');
		cy.intercept('GET', '/rest/users').as('getUsers');
		cy.intercept('GET', '/rest/workflows?*').as('getWorkflows');
		cy.intercept('GET', '/rest/active-workflows').as('getActiveWorkflows');
		cy.intercept('GET', '/rest/credentials?*').as('getCredentials');

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
