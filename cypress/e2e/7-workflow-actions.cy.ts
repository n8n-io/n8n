import {
	CODE_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	META_KEY,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const NEW_WORKFLOW_NAME = 'Something else';
const IMPORT_WORKFLOW_URL = 'https://gist.githubusercontent.com/OlegIvaniv/010bd3f45c8a94f8eb7012e663a8b671/raw/3afea1aec15573cc168d9af7e79395bd76082906/test-workflow.json';
const DUPLICATE_WORKFLOW_NAME = 'Duplicated workflow';
const DUPLICATE_WORKFLOW_TAG = 'Duplicate';

const WorkflowPage = new WorkflowPageClass();

describe('Workflow Actions', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
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
		WorkflowPage.getters
			.workflowNameInputContainer()
			.invoke('attr', 'title')
			.should('eq', NEW_WORKFLOW_NAME);
	});

	it('should copy nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);

		cy.get('#node-creator').should('not.exist');
		cy.get('body').type(META_KEY, { delay: 500, release: false }).type('a');
		cy.get('.jtk-drag-selected').should('have.length', 2);
		cy.get('body').type(META_KEY, { delay: 500, release: false }).type('c');
		WorkflowPage.getters.successToast().should('exist');
	});

	it('should paste nodes', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
			WorkflowPage.getters.canvasNodes().should('have.have.length', 2);
		});
	});

	it('should import workflow from url', () => {
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemImportFromURLItem().should('be.visible');
		WorkflowPage.getters.workflowMenuItemImportFromURLItem().click();
		cy.get('.el-message-box').should('be.visible');
		cy.get('.el-message-box').find('input').type(IMPORT_WORKFLOW_URL);
		cy.get('body').type('{enter}');
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should import workflow from file', () => {
		WorkflowPage.getters
			.workflowImportInput()
			.selectFile('cypress/fixtures/Test_workflow-actions_paste-data.json', { force: true });
		WorkflowPage.actions.zoomToFit();
		WorkflowPage.getters.canvasNodes().should('have.length', 2);
		WorkflowPage.getters.nodeConnections().should('have.length', 1);
	});

	it('should update workflow settings', () => {
		cy.resetAll();
		cy.skipSetup();
		WorkflowPage.actions.visit();
		// Open settings dialog
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemSettings().should('be.visible');
		WorkflowPage.getters.workflowMenuItemSettings().click();
		// Change all settings
		WorkflowPage.getters.workflowSettingsErrorWorkflowSelect().find('li').should('have.length', 2);
		WorkflowPage.getters
			.workflowSettingsErrorWorkflowSelect()
			.find('li')
			.last()
			.click({ force: true });
		WorkflowPage.getters.workflowSettingsTimezoneSelect().find('li').should('exist');
		WorkflowPage.getters.workflowSettingsTimezoneSelect().find('li').eq(1).click({ force: true });
		WorkflowPage.getters
			.workflowSettingsSaveFiledExecutionsSelect()
			.find('li')
			.should('have.length', 3);
		WorkflowPage.getters
			.workflowSettingsSaveFiledExecutionsSelect()
			.find('li')
			.last()
			.click({ force: true });
		WorkflowPage.getters
			.workflowSettingsSaveSuccessExecutionsSelect()
			.find('li')
			.should('have.length', 3);
		WorkflowPage.getters
			.workflowSettingsSaveSuccessExecutionsSelect()
			.find('li')
			.last()
			.click({ force: true });
		WorkflowPage.getters
			.workflowSettingsSaveManualExecutionsSelect()
			.find('li')
			.should('have.length', 3);
		WorkflowPage.getters
			.workflowSettingsSaveManualExecutionsSelect()
			.find('li')
			.last()
			.click({ force: true });
		WorkflowPage.getters
			.workflowSettingsSaveExecutionProgressSelect()
			.find('li')
			.should('have.length', 3);
		WorkflowPage.getters
			.workflowSettingsSaveExecutionProgressSelect()
			.find('li')
			.last()
			.click({ force: true });
		WorkflowPage.getters.workflowSettingsTimeoutWorkflowSwitch().click();
		WorkflowPage.getters.workflowSettingsTimeoutForm().find('input').first().type('1');
		// Save settings
		WorkflowPage.getters.workflowSettingsSaveButton().click();
		WorkflowPage.getters.workflowSettingsModal().should('not.exist');
		WorkflowPage.getters.successToast().should('exist');
	});

	it('should not be able to delete unsaved workflow', () => {
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemDelete().closest('li').should('have.class', 'is-disabled');
	});

	it('should delete workflow', () => {
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemDelete().click();
		cy.get('div[role=dialog][aria-modal=true]').should('be.visible');
		cy.get('button.btn--confirm').should('be.visible').click();
		WorkflowPage.getters.successToast().should('exist');
		cy.url().should('include', '/workflow/new');
	});

	it('should duplicate workflow', () => {
		// Stub window.open so new tab is not getting opened
		cy.window().then((win) => {
			cy.stub(win, 'open').as('open');
		});

		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemDuplicate().click();
		WorkflowPage.getters.duplicateWorkflowModal().should('be.visible');
		WorkflowPage.getters.duplicateWorkflowModal().find('input').first().should('be.visible');
		WorkflowPage.getters.duplicateWorkflowModal().find('input').first().type('{selectall}');
		WorkflowPage.getters
			.duplicateWorkflowModal()
			.find('input')
			.first()
			.type(DUPLICATE_WORKFLOW_NAME);
		WorkflowPage.getters
			.duplicateWorkflowModal()
			.find('.el-select__tags input')
			.type(DUPLICATE_WORKFLOW_TAG);
		WorkflowPage.getters.duplicateWorkflowModal().find('.el-select__tags input').type('{enter}');
		WorkflowPage.getters.duplicateWorkflowModal().find('.el-select__tags input').type('{enter}');
		WorkflowPage.getters
			.duplicateWorkflowModal()
			.find('button')
			.contains('Duplicate')
			.should('be.visible');
		WorkflowPage.getters.duplicateWorkflowModal().find('button').contains('Duplicate').click();
		WorkflowPage.getters.errorToast().should('not.exist');
	});
});
