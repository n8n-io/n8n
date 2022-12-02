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
		cy.get('body').paste(`{"meta":{"instanceId":"1a30c82b98a30444ad25bce513655a5e02be772d361403542c23172be6062f04"},"nodes":[{"parameters":{"rule":{"interval":[{}]}},"id":"a898563b-d2a4-4b15-a979-366872e801b0","name":"Schedule Trigger","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1,"position":[420,260]},{"parameters":{"options":{}},"id":"b9a13e3d-bfa5-4873-959f-fd3d67e380d9","name":"Set","type":"n8n-nodes-base.set","typeVersion":1,"position":[640,260]}],"connections":{"Schedule Trigger":{"main":[[{"node":"Set","type":"main","index":0}]]}}}`);
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
	});

});
