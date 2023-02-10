import { BasePage } from "./base";
import { WorkflowPage } from "./workflow";

const workflowPage = new WorkflowPage();

export class WorkflowExecutionsTab extends BasePage {
	getters = {
		executionsTabButton: () => cy.getByTestId('radio-button-executions'),
		executionsSidebar: () => cy.getByTestId('executions-sidebar'),
		autoRefreshCheckBox: () => cy.getByTestId('auto-refresh-checkbox'),
		executionsList: () => cy.getByTestId('current-executions-list'),
		executionListItems: () => this.getters.executionsList().find('div.execution-card'),
		successfulExecutionListItems: () => cy.get('[data-test-execution-status="success"]'),
		failedExecutionListItems: () => cy.get('[data-test-execution-status="error"]'),
		executionCard: (executionId: string) => cy.getByTestId(`execution-details-${executionId}`),
		executionPreviewDetails: () => cy.get('[data-test-id^="execution-preview-details-"]'),
		executionPreviewDetailsById: (executionId: string) => cy.getByTestId(`execution-preview-details-${executionId}`),
		executionPreviewTime: () => this.getters.executionPreviewDetails().find('[data-test-id="execution-time"]'),
		executionPreviewStatus: () => this.getters.executionPreviewDetails().find('[data-test-id="execution-preview-label"]'),
		executionPreviewId: () => this.getters.executionPreviewDetails().find('[data-test-id="execution-preview-id"]'),
	};
	actions = {
		prepareExecutions: () => {
			workflowPage.actions.turnOnManualExecutionSaving();
			this.actions.createManualExecutions(5);
			this.actions.toggleNodeEnabled('Error');
			// Make some failed executions by enabling Code node with syntax error
			this.actions.createManualExecutions(2);
			this.actions.toggleNodeEnabled('Error');
			this.actions.createManualExecutions(4);
			this.actions.switchToEditorTab();
			this.actions.switchToExecutionsTab();
			cy.waitForLoad();
		},
		toggleNodeEnabled: (nodeName: string) => {
			workflowPage.getters.canvasNodeByName(nodeName).click();
			cy.get('body').type('d', { force: true });
		},
		createManualExecutions: (count: number) => {
			for (let i=0; i<count; i++) {
				workflowPage.actions.executeWorkflow();
				cy.wait(300);
			}
		},
		switchToExecutionsTab: () => {
			this.getters.executionsTabButton().click();
		},
		switchToEditorTab: () => {
			workflowPage.getters.editorTabButton().click();
		}
	};
};
