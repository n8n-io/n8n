import { BasePage } from '../base';

export class MessageBox extends BasePage {
	getters = {
		modal: () => cy.get('.el-message-box', { withinSubject: null }),
		header: () => this.getters.modal().find('.el-message-box__title'),
		content: () => this.getters.modal().find('.el-message-box__content'),
		confirm: () => this.getters.modal().find('.btn--confirm').first(),
		cancel: () => this.getters.modal().find('.btn--cancel').first(),
	};

	actions = {
		confirm: () => {
			this.getters.confirm().click({ force: true });
		},
		cancel: () => {
			this.getters.cancel().click({ force: true });
		},
	};
}
