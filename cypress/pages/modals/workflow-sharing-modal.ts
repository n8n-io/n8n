import { BasePage } from '../base';

export class WorkflowSharingModal extends BasePage {
	getters = {
		modal: () => cy.getByTestId('workflowShare-modal', { timeout: 5000 }),
		usersSelect: () => cy.getByTestId('workflow-sharing-modal-users-select'),
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
