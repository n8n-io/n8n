import { BasePage } from "./base";

export class WorkflowHistoryPage extends BasePage {
    getters = {
        workflowHistoryCloseButton: () => cy.getByTestId('workflow-history-close-button'),
    }
}
