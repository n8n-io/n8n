import { randFirstName, randLastName } from "@ngneat/falso";
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from "../constants";
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const NEW_WORKFLOW_NAME = 'Something else';
const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const WorkflowPage = new WorkflowPageClass();

describe('Workflow Actions', () => {
	before(() => {
		cy.resetAll();
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		})

		cy.signin({ email, password });

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

});
