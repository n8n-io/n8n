import {
	CODE_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	NOTION_NODE_NAME,
} from '../constants';
import { WorkflowExecutionsTab } from '../pages';
import { errorToast, successToast } from '../pages/notifications';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { getVisibleSelect } from '../utils';

const NEW_WORKFLOW_NAME = 'Something else';
const DUPLICATE_WORKFLOW_NAME = 'Duplicated workflow';
const DUPLICATE_WORKFLOW_TAG = 'Duplicate';

const WorkflowPage = new WorkflowPageClass();
const WorkflowPages = new WorkflowsPageClass();
const executionsTab = new WorkflowExecutionsTab();

describe('Workflow Actions', () => {
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

	it('should not save already saved workflow', () => {
		cy.intercept('PATCH', '/rest/workflows/*').as('saveWorkflow');
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.wait('@saveWorkflow');
		WorkflowPage.getters.isWorkflowSaved();
		// Try to save a few times
		WorkflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		WorkflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		// Should be saved only once
		cy.get('@saveWorkflow.all').should('have.length', 1);
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

	it('should not be be able to activate workflow when nodes have errors', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		successToast().should('exist');
		WorkflowPage.actions.clickWorkflowActivator();
		errorToast().should('exist');
	});

	it('should be be able to activate workflow when nodes with errors are disabled', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(NOTION_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		successToast().should('exist');
		// First, try to activate the workflow with errors
		WorkflowPage.actions.clickWorkflowActivator();
		errorToast().should('exist');
		// Now, disable the node with errors
		WorkflowPage.getters.canvasNodes().last().click();
		WorkflowPage.actions.hitDisableNodeShortcut();
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

	it('should not save workflow if canvas is loading', () => {
		let interceptCalledCount = 0;

		// There's no way in Cypress to check if intercept was not called
		// so we'll count the number of times it was called
		cy.intercept('PATCH', '/rest/workflows/*', () => {
			interceptCalledCount++;
		}).as('saveWorkflow');

		WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		cy.intercept(
			{
				url: '/rest/workflows/*',
				method: 'GET',
				middleware: true,
			},
			(req) => {
				// Delay the response to give time for the save to be triggered
				req.on('response', async (res) => {
					await new Promise((resolve) => setTimeout(resolve, 2000));
					res.send();
				});
			},
		);
		cy.reload();
		cy.get('.el-loading-mask').should('exist');
		WorkflowPage.actions.hitSaveWorkflow();
		WorkflowPage.actions.hitSaveWorkflow();
		WorkflowPage.actions.hitSaveWorkflow();
		cy.wrap(null).then(() => expect(interceptCalledCount).to.eq(0));
		cy.waitForLoad();
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.hitSaveWorkflow();
		cy.wait('@saveWorkflow');
		cy.wrap(null).then(() => expect(interceptCalledCount).to.eq(1));
	});

	it('should not save workflow twice when save is in progress', () => {
		// This happens when users click save button from workflow name input
		// In this case blur on the input saves the workflow and then click on the button saves it again
		WorkflowPage.actions.visit();
		WorkflowPage.getters
			.workflowNameInput()
			.invoke('val')
			.then((oldName) => {
				WorkflowPage.getters.workflowNameInputContainer().click();
				WorkflowPage.getters.workflowNameInput().type('{selectall}');
				WorkflowPage.getters.workflowNameInput().type('Test');
				WorkflowPage.getters.saveButton().click();
				WorkflowPage.getters.workflowNameInput().should('have.value', 'Test');
				cy.visit(WorkflowPages.url);
				// There should be no workflow with the old name (duplicate save)
				WorkflowPages.getters.workflowCards().contains(String(oldName)).should('not.exist');
			});
	});

	it('should copy nodes', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(CODE_NODE_NAME);
		WorkflowPage.getters.canvasNodes().should('have.have.length', 2);

		cy.get('#node-creator').should('not.exist');

		WorkflowPage.actions.hitSelectAll();
		WorkflowPage.actions.hitCopy();
		successToast().should('exist');
		// Both nodes should be copied
		cy.window()
			.its('navigator.clipboard')
			.then((clip) => clip.readText())
			.then((text) => {
				const copiedWorkflow = JSON.parse(text);
				expect(copiedWorkflow.nodes).to.have.length(2);
			});
	});

	it('should paste nodes (both current and old node versions)', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.getters.canvasNodes().should('have.length', 5);
			WorkflowPage.getters.nodeConnections().should('have.length', 5);
		});
	});

	it('should allow importing nodes without names', () => {
		cy.fixture('Test_workflow-actions_import_nodes_empty_name.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.getters.canvasNodes().should('have.length', 3);
			WorkflowPage.getters.nodeConnections().should('have.length', 2);
			// Check if all nodes have names
			WorkflowPage.getters.canvasNodes().each((node) => {
				cy.wrap(node).should('have.attr', 'data-node-name');
			});
		});
	});

	it('should update workflow settings', () => {
		cy.visit(WorkflowPages.url);
		cy.intercept('GET', '/rest/workflows', (req) => {
			req.on('response', (res) => {
				const totalWorkflows = res.body.count ?? 0;

				WorkflowPage.actions.visit();
				// Open settings dialog
				WorkflowPage.actions.saveWorkflowOnButtonClick();
				WorkflowPage.getters.workflowMenu().should('be.visible');
				WorkflowPage.getters.workflowMenu().click();
				WorkflowPage.getters.workflowMenuItemSettings().should('be.visible');
				WorkflowPage.getters.workflowMenuItemSettings().click();
				// Change all settings
				// totalWorkflows + 1 (current workflow) + 1 (no workflow option)
				WorkflowPage.getters.workflowSettingsErrorWorkflowSelect().click();
				getVisibleSelect()
					.find('li')
					.should('have.length', totalWorkflows + 2);
				getVisibleSelect().find('li').last().click({ force: true });
				WorkflowPage.getters.workflowSettingsTimezoneSelect().click();
				getVisibleSelect().find('li').should('exist');
				getVisibleSelect().find('li').eq(1).click({ force: true });
				WorkflowPage.getters.workflowSettingsSaveFiledExecutionsSelect().click();
				getVisibleSelect().find('li').should('have.length', 3);
				getVisibleSelect().find('li').last().click({ force: true });
				WorkflowPage.getters.workflowSettingsSaveSuccessExecutionsSelect().click();
				getVisibleSelect().find('li').should('have.length', 3);
				getVisibleSelect().find('li').last().click({ force: true });
				WorkflowPage.getters.workflowSettingsSaveManualExecutionsSelect().click();
				getVisibleSelect().find('li').should('have.length', 3);
				getVisibleSelect().find('li').last().click({ force: true });
				WorkflowPage.getters.workflowSettingsSaveExecutionProgressSelect().click();
				getVisibleSelect().find('li').should('have.length', 3);
				getVisibleSelect().find('li').last().click({ force: true });
				WorkflowPage.getters.workflowSettingsTimeoutWorkflowSwitch().click();
				WorkflowPage.getters.workflowSettingsTimeoutForm().find('input').first().type('1');
				// Save settings
				WorkflowPage.getters.workflowSettingsSaveButton().click();
				WorkflowPage.getters.workflowSettingsModal().should('not.exist');
				successToast().should('exist');
			});
		}).as('loadWorkflows');
	});

	it('should not be able to archive or delete unsaved workflow', () => {
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemDelete().should('not.exist');
		WorkflowPage.getters
			.workflowMenuItemArchive()
			.closest('li')
			.should('have.class', 'is-disabled');
	});

	it('should archive nonactive workflow and then delete it', () => {
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.archivedTag().should('not.exist');

		// Archive the workflow
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemArchive().click();

		successToast().should('exist');
		cy.url().should('include', WorkflowPages.url);

		// Return back to the workflow
		cy.go('back');

		WorkflowPage.getters.archivedTag().should('be.visible');
		WorkflowPage.getters.nodeCreatorPlusButton().should('not.exist');

		// Delete the workflow
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemDelete().click();
		WorkflowPage.actions.acceptConfirmModal();
		successToast().should('exist');
		cy.url().should('include', WorkflowPages.url);
	});

	it('should archive active workflow and then delete it', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();
		WorkflowPage.getters.isWorkflowActivated();
		WorkflowPage.getters.archivedTag().should('not.exist');

		// Archive the workflow
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemArchive().click();
		WorkflowPage.actions.acceptConfirmModal();

		successToast().should('exist');
		cy.url().should('include', WorkflowPages.url);

		// Return back to the workflow
		cy.go('back');

		WorkflowPage.getters.archivedTag().should('be.visible');
		WorkflowPage.getters.nodeCreatorPlusButton().should('not.exist');
		WorkflowPage.getters.isWorkflowDeactivated();

		// Delete the workflow
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemDelete().click();
		WorkflowPage.actions.acceptConfirmModal();
		successToast().should('exist');
		cy.url().should('include', WorkflowPages.url);
	});

	it('should archive nonactive workflow and then unarchive it', () => {
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.archivedTag().should('not.exist');

		// Archive the workflow
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemArchive().click();

		successToast().should('exist');
		cy.url().should('include', WorkflowPages.url);

		// Return back to the workflow
		cy.go('back');

		WorkflowPage.getters.archivedTag().should('be.visible');
		WorkflowPage.getters.nodeCreatorPlusButton().should('not.exist');

		// Unarchive the workflow
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemUnarchive().click();
		successToast().should('exist');
		WorkflowPage.getters.archivedTag().should('not.exist');
		WorkflowPage.getters.nodeCreatorPlusButton().should('be.visible');
	});

	it('should deactivate active workflow on archive', () => {
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();
		WorkflowPage.getters.isWorkflowActivated();

		// Archive the workflow
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemArchive().click();
		WorkflowPage.actions.acceptConfirmModal();
		successToast().should('exist');
		cy.url().should('include', WorkflowPages.url);

		// Return back to the workflow
		cy.go('back');

		WorkflowPage.getters.archivedTag().should('be.visible');
		WorkflowPage.getters.isWorkflowDeactivated();
		WorkflowPage.getters.activatorSwitch().find('input').first().should('be.disabled');

		// Unarchive the workflow
		WorkflowPage.getters.workflowMenu().should('be.visible');
		WorkflowPage.getters.workflowMenu().click();
		WorkflowPage.getters.workflowMenuItemUnarchive().click();
		successToast().should('exist');
		WorkflowPage.getters.archivedTag().should('not.exist');

		// Activate the workflow again
		WorkflowPage.actions.activateWorkflow();
		WorkflowPage.getters.isWorkflowActivated();
	});

	describe('duplicate workflow', () => {
		function duplicateWorkflow() {
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
			WorkflowPage.getters.duplicateWorkflowModal().find('.el-select__tags input').type('{esc}');
			WorkflowPage.getters
				.duplicateWorkflowModal()
				.find('button')
				.contains('Duplicate')
				.should('be.visible');
			WorkflowPage.getters.duplicateWorkflowModal().find('button').contains('Duplicate').click();
			errorToast().should('not.exist');
		}

		beforeEach(() => {
			// Stub window.open so new tab is not getting opened
			cy.window().then((win) => {
				cy.stub(win, 'open').as('open');
			});
			WorkflowPage.actions.addNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		});

		it('should duplicate unsaved workflow', () => {
			duplicateWorkflow();
		});

		it('should duplicate saved workflow', () => {
			WorkflowPage.actions.saveWorkflowOnButtonClick();
			duplicateWorkflow();
		});
	});

	it('should keep endpoint click working when switching between execution and editor tab', () => {
		cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');

		WorkflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();

		WorkflowPage.getters.canvasNodePlusEndpointByName(EDIT_FIELDS_SET_NODE_NAME).click();
		WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
		cy.get('body').type('{esc}');

		executionsTab.actions.switchToExecutionsTab();
		cy.wait(['@getExecutions']);
		cy.wait(500);
		executionsTab.actions.switchToEditorTab();

		WorkflowPage.getters.canvasNodePlusEndpointByName(EDIT_FIELDS_SET_NODE_NAME).click();
		WorkflowPage.getters.nodeCreatorSearchBar().should('be.visible');
	});

	it('should run workflow on button click', () => {
		WorkflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.executeWorkflowButton().click();
		successToast().should('contain.text', 'Workflow executed successfully');
	});

	it('should run workflow using keyboard shortcut', () => {
		WorkflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.hitExecuteWorkflow();
		successToast().should('contain.text', 'Workflow executed successfully');
	});

	it('should not run empty workflows', () => {
		// Clear the canvas
		WorkflowPage.actions.hitDeleteAllNodes();
		WorkflowPage.getters.canvasNodes().should('have.length', 0);
		WorkflowPage.getters.executeWorkflowButton().should('not.exist');
		// Keyboard shortcut should not work
		WorkflowPage.actions.hitExecuteWorkflow();
		successToast().should('not.exist');
	});
});

describe('Menu entry Push To Git', () => {
	it('should not show up in the menu for members', () => {
		cy.signinAsMember(0);
		cy.visit(WorkflowPages.url);
		WorkflowPage.actions.visit();
		WorkflowPage.getters.workflowMenuItemGitPush().should('not.exist');
	});

	it('should show up for owners', () => {
		cy.signinAsOwner();
		cy.visit(WorkflowPages.url);
		WorkflowPage.actions.visit();
		WorkflowPage.getters.workflowMenuItemGitPush().should('exist');
	});
});
