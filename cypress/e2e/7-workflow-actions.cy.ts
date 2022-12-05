import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const NEW_WORKFLOW_NAME = 'Something else';
const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';
const CODE_NODE = 'Code'
const TEST_WF_TAGS = ['Tag 1', 'Tag 2', 'Tag 3'];

const WorkflowPage = new WorkflowPageClass();

describe('Workflow Actions', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		WorkflowPage.actions.visit();
	});

	it('should be able to save on button click', () => {
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.isWorkflowSaved();
	});

	it('should save workflow on keyboard shortcut', () => {
		WorkflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		WorkflowPage.getters.isWorkflowSaved();
	});

	it('should not be able to activate unsaved workflow', () => {
		WorkflowPage.getters.activatorSwitch().find('input').first().should('be.disabled');
	});

	it('should not be able to activate workflow without trigger node', () => {
		// Manual trigger is not enough to activate the workflow
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.activatorSwitch().find('input').first().should('be.disabled');
	});

	it('should be able to activate workflow', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();
		WorkflowPage.getters.isWorkflowActivated();
	});

	it('should save new workflow after renaming', () => {
		WorkflowPage.actions.renameWorkflow(NEW_WORKFLOW_NAME);
		WorkflowPage.getters.isWorkflowSaved();
	});

	it('should rename workflow', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.renameWorkflow(NEW_WORKFLOW_NAME);
		WorkflowPage.getters.isWorkflowSaved();
		WorkflowPage.getters.workflowNameInputContainer().invoke('attr', 'title').should('eq', NEW_WORKFLOW_NAME);
	});

	it('should add tags', () => {
		WorkflowPage.getters.newTagLink().click();
		WorkflowPage.actions.addTags(TEST_WF_TAGS);
		WorkflowPage.getters.isWorkflowSaved();
		WorkflowPage.getters.workflowTagElements().should('have.length', TEST_WF_TAGS.length);
	});

	it('should add more tags', () => {
		WorkflowPage.getters.newTagLink().click();
		WorkflowPage.actions.addTags(TEST_WF_TAGS);
		WorkflowPage.getters.workflowTagElements().first().click();
		WorkflowPage.actions.addTags(['Another one']);
		WorkflowPage.getters.workflowTagElements().should('have.length', TEST_WF_TAGS.length + 1);
	});

	it('should remove tags by clicking X in tag', () => {
		WorkflowPage.getters.newTagLink().click();
		WorkflowPage.actions.addTags(TEST_WF_TAGS);
		WorkflowPage.getters.workflowTagElements().first().click();
		WorkflowPage.getters.workflowTagsContainer().find('.el-tag__close').first().click();
		cy.get('body').type('{enter}');
		WorkflowPage.getters.workflowTagElements().should('have.length', TEST_WF_TAGS.length - 1);
	});

	it('should remove tags from dropdown', () => {
		WorkflowPage.getters.newTagLink().click();
		WorkflowPage.actions.addTags(TEST_WF_TAGS);
		WorkflowPage.getters.workflowTagElements().first().click();
		WorkflowPage.getters.workflowTagsDropdown().find('li').first().click();
		cy.get('body').type('{enter}');
		WorkflowPage.getters.workflowTagElements().should('have.length', TEST_WF_TAGS.length - 1);
	});

	it('should copy nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE);
		cy.get('body').type('{meta}', { release: false }).type('a');
		cy.get('body').type('{meta}', { release: false }).type('c');
		WorkflowPage.getters.successToast().should('exist');
	});

	it('should paste nodes', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then(data => {
			cy.get('body').paste(JSON.stringify(data));
			WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		});
	});

});
