import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';
import { SCHEDULE_TRIGGER_NODE_NAME } from '../constants';
import { getVisibleSelect } from '../utils';
import { overrideFeatureFlag } from '../composables/featureFlags';

const WorkflowPage = new WorkflowPageClass();

describe('Workflow Suggested Actions', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	const getSuggestedActionsButton = () => cy.getByTestId('suggested-action-count');
	const getSuggestedActionsPopover = () =>
		cy.get('[data-reka-popper-content-wrapper=""]').filter(':visible');
	const getActionItemByActionId = (id: string) =>
		cy.getByTestId('suggested-action-item').filter(`[data-action-id="${id}"]`);

	const getActionIgnoreButton = (text: string) =>
		getActionItemByActionId(text).find('[data-test-id="suggested-action-ignore"]');
	const getIgnoreAllButton = () => cy.getByTestId('suggested-action-ignore-all');
	const getActionCompletedIcon = (text: string) =>
		getActionItemByActionId(text).find('[data-icon=circle-check]');

	it('should show suggested actions when workflow is activated', () => {
		// Add a schedule trigger node (activatable)
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();

		// Verify suggested actions button is not visible
		getSuggestedActionsButton().should('not.exist');

		// Activate the workflow
		WorkflowPage.actions.activateWorkflow();

		// Verify suggested actions button appears
		getSuggestedActionsButton().should('be.visible');
	});

	it('should display evaluations action when AI node exists and feature is enabled', () => {
		// Enable evaluations feature
		overrideFeatureFlag('feat:evaluation', true);

		// Add schedule trigger and AI node
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.addNodeToCanvas('OpenAI');
		WorkflowPage.actions.disableNode('Create an assistant');
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();

		// Open suggested actions
		getSuggestedActionsButton().click();
		getSuggestedActionsPopover().should('be.visible');

		// Verify evaluations action is present
		cy.getByTestId('suggested-action-item').contains('evaluation').should('be.visible');

		// Click evaluations
		cy.getByTestId('suggested-action-item').contains('evaluation').click();

		// Verify navigation to evaluations page
		cy.url().should('include', '/evaluation');
	});

	it('should open workflow settings modal when error workflow action is clicked', () => {
		// Add schedule trigger
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();

		// Open suggested actions
		getSuggestedActionsButton().click();
		getSuggestedActionsPopover().should('be.visible');

		// Click error workflow action
		cy.getByTestId('suggested-action-item').contains('error').should('be.visible');
		cy.getByTestId('suggested-action-item').contains('error').click();

		// Verify workflow settings modal opens
		WorkflowPage.getters.workflowSettingsModal().should('be.visible');
		WorkflowPage.getters.workflowSettingsErrorWorkflowSelect().should('be.visible');
	});

	it('should open workflow settings modal when time saved action is clicked', () => {
		// Add schedule trigger
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();

		// Open suggested actions
		getSuggestedActionsButton().click();
		getSuggestedActionsPopover().should('be.visible');

		// Click time saved action
		cy.getByTestId('suggested-action-item').contains('time').should('be.visible');
		cy.getByTestId('suggested-action-item').contains('time').click();

		// Verify workflow settings modal opens
		WorkflowPage.getters.workflowSettingsModal().should('be.visible');
	});

	it('should allow ignoring individual actions', () => {
		// Add schedule trigger
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();

		// Open suggested actions
		getSuggestedActionsButton().click();
		getSuggestedActionsPopover().should('be.visible');

		// Verify error workflow action is visible
		// getActionItemByText('errors').should('be.visible');
		getActionItemByActionId('errorWorkflow').should('be.visible');

		// Click ignore button for error workflow
		getActionIgnoreButton('errorWorkflow').click();

		// Close and reopen popover
		cy.get('body').click(0, 0); // Click outside to close
		getSuggestedActionsButton().click();

		// Verify error workflow action is no longer visible
		cy.getByTestId('suggested-action-item').contains('errorWorkflow').should('not.exist');
		// But time saved should still be visible
		cy.getByTestId('suggested-action-item').contains('time').should('be.visible');
	});

	it('should show completed state for configured actions', () => {
		// Add schedule trigger
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();

		// Open workflow settings and set error workflow
		WorkflowPage.actions.openWorkflowMenu();
		WorkflowPage.getters.workflowMenuItemSettings().click();
		WorkflowPage.getters.workflowSettingsModal().should('be.visible');

		// Set an error workflow (we'll use a dummy value)
		WorkflowPage.getters.workflowSettingsErrorWorkflowSelect().click();
		getVisibleSelect().find('li').eq(1).click();

		// Save settings
		WorkflowPage.getters.workflowSettingsSaveButton().click();
		WorkflowPage.getters.workflowSettingsModal().should('not.exist');

		// Open suggested actions
		getSuggestedActionsButton().click();
		getSuggestedActionsPopover().should('be.visible');

		// Verify error workflow action shows as completed
		getActionCompletedIcon('errorWorkflow').should('be.visible');
	});

	it.skip('should auto-open popover on first workflow activation', () => {
		// Add schedule trigger
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();

		// Activate workflow - popover should auto-open
		WorkflowPage.actions.activateWorkflow();

		// Verify popover opened automatically
		getSuggestedActionsPopover().should('be.visible');

		// Close popover
		cy.get('body').click(0, 0);
		getSuggestedActionsPopover().should('not.exist');

		// Deactivate and reactivate - popover should not auto-open again
		WorkflowPage.actions.activateWorkflow(); // This toggles to deactivate
		WorkflowPage.actions.activateWorkflow(); // This toggles to activate

		// Verify popover did not auto-open
		getSuggestedActionsPopover().should('not.exist');
	});

	it('should not show evaluations action without AI nodes', () => {
		// Enable evaluations feature
		overrideFeatureFlag('feat:evaluation', true);

		// Add schedule trigger (no AI nodes)
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();

		// Open suggested actions
		getSuggestedActionsButton().click();
		getSuggestedActionsPopover().should('be.visible');

		// Verify evaluations action is not present
		cy.getByTestId('suggested-action-item').contains('evaluation').should('not.exist');
		// But other actions should be visible
		cy.getByTestId('suggested-action-item').contains('error').should('be.visible');
		cy.getByTestId('suggested-action-item').contains('time').should('be.visible');
	});

	it('should allow ignoring all actions with confirmation', () => {
		// Add schedule trigger
		WorkflowPage.actions.addNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();

		// Open suggested actions
		getSuggestedActionsButton().click();
		getSuggestedActionsPopover().should('be.visible');

		// Click ignore all button
		getIgnoreAllButton().click();

		// Confirm in the dialog
		cy.get('.el-message-box').should('be.visible');
		cy.get('.el-message-box__btns button').contains('Ignore for all workflows').click();

		// Verify suggested actions button is no longer visible
		getSuggestedActionsButton().should('not.exist');
	});
});
