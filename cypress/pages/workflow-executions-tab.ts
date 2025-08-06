import { BasePage } from './base';
import { WorkflowPage } from './workflow';

const workflowPage = new WorkflowPage();

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class WorkflowExecutionsTab extends BasePage {
	getters = {
		executionsTabButton: () => cy.getByTestId('radio-button-executions'),
		executionsSidebar: () => cy.getByTestId('executions-sidebar'),
		executionsEmptyList: () => cy.getByTestId('execution-list-empty'),
		autoRefreshCheckBox: () => cy.getByTestId('auto-refresh-checkbox'),
		executionsList: () => cy.getByTestId('current-executions-list'),
		executionListItems: () => this.getters.executionsList().find('div.execution-card'),
		successfulExecutionListItems: () => cy.get('[data-test-execution-status="success"]'),
		failedExecutionListItems: () => cy.get('[data-test-execution-status="error"]'),
		executionCard: (executionId: string) => cy.getByTestId(`execution-details-${executionId}`),
		executionPreviewDetails: () => cy.get('[data-test-id^="execution-preview-details-"]'),
		executionPreviewDeleteButton: () => cy.get('[data-test-id="execution-preview-delete-button"]'),
		executionPreviewDetailsById: (executionId: string) =>
			cy.getByTestId(`execution-preview-details-${executionId}`),
		executionPreviewTime: () =>
			this.getters.executionPreviewDetails().find('[data-test-id="execution-time"]'),
		executionPreviewStatus: () =>
			this.getters.executionPreviewDetails().find('[data-test-id="execution-preview-label"]'),
		executionPreviewId: () =>
			this.getters.executionPreviewDetails().find('[data-test-id="execution-preview-id"]'),
		executionDebugButton: () => cy.getByTestId('execution-debug-button'),
		workflowExecutionPreviewIframe: () => cy.getByTestId('workflow-preview-iframe'),
	};

	actions = {
		toggleNodeEnabled: (nodeName: string) => {
			cy.get('body').click(); // Cancel selection if it exists
			workflowPage.getters.canvasNodeByName(nodeName).click();
			cy.get('body').type('d', { force: true });
		},
		createManualExecutions: (count: number) => {
			for (let i = 0; i < count; i++) {
				cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowExecution');
				workflowPage.actions.executeWorkflow();
				cy.wait('@workflowExecution');
			}
		},
		switchToExecutionsTab: () => {
			this.getters.executionsTabButton().click();
			cy.url().should('include', '/executions');
		},
		switchToEditorTab: () => {
			workflowPage.getters.editorTabButton().click();
			cy.url().should('match', /\/workflow\/[^\/]+$/);
		},
		deleteExecutionInPreview: () => {
			this.getters.executionPreviewDeleteButton().click();
			cy.get('button.btn--confirm').click();
		},
	};
}
