import { BasePage } from '../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class WorkflowSharingModal extends BasePage {
	getters = {
		modal: () => cy.getByTestId('workflowShare-modal', { timeout: 5000 }),
		usersSelect: () => cy.getByTestId('project-sharing-select'),
		saveButton: () => cy.getByTestId('workflow-sharing-modal-save-button'),
		closeButton: () => this.getters.modal().find('.el-dialog__close').first(),
	};

	actions = {
		addUser: (email: string) => {
			this.getters.usersSelect().click();
			this.getters
				.usersSelect()
				.get('.el-select-dropdown__item')
				.contains(email.toLowerCase())
				.click();
		},
		save: () => {
			this.getters.saveButton().click();
		},
		closeModal: () => {
			this.getters.closeButton().click();
		},
	};
}
