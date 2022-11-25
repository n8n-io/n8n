import { randFirstName, randLastName } from "@ngneat/falso";
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from "../constants";
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const username = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const newWorkflowName = 'Something else';
const WorkflowPage = new WorkflowPageClass();

describe('Workflow Actions', () => {
	beforeEach(() => {
		cy.signup(username, firstName, lastName, password);
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		})

		cy.signin(username, password);
	});

	it('should be able to save on button slick', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		// In Element UI, disabled button turn into spans 🤷‍♂️
		WorkflowPage.getters.saveButton().should('match', 'span');
	});

	it('should save workflow on keyboard shortcut', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		WorkflowPage.getters.saveButton().should('match', 'span');
	});

	it('should not be able to activate unsaved workflow', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.getters.activatorSwitch().find('input').first().should('be.disabled');
	});

	it('should not be able to activate workflow without trigger node', () => {
		WorkflowPage.actions.visit();
		// Manual trigger is not enough to activate the workflow
		WorkflowPage.actions.addTriggerNode('n8n-nodes-base.manualTrigger');
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.activatorSwitch().find('input').first().should('be.disabled');
	});

	it('should be able to activate workflow', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addTriggerNode('n8n-nodes-base.scheduleTrigger');
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();
		WorkflowPage.getters.activatorSwitch().should('have.class', 'is-checked');
	});

	it('should save new workflow after renaming', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.renameWorkflow(newWorkflowName);
		WorkflowPage.getters.saveButton().should('match', 'span');
	});

	it('should rename workflow', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addTriggerNode('n8n-nodes-base.scheduleTrigger');
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.renameWorkflow(newWorkflowName);
		WorkflowPage.getters.saveButton().should('match', 'span');
		WorkflowPage.getters.workflowNameInput().invoke('attr', 'title').should('eq', newWorkflowName);
	});
});
