import { BasePage } from '../base';

export class MessageBox extends BasePage {
	getters = {
		modal: () => cy.get('.el-message-box', { withinSubject: null }),
		header: () => this.getters.modal().find('.el-message-box__title'),
		content: () => this.getters.modal().find('.el-message-box__content'),
		confirm: () => this.getters.modal().find('.btn--confirm'),
		cancel: () => this.getters.modal().find('.btn--cancel'),
	};
	actions = {
		confirm: () => {
			this.getters.confirm().click();
		},
		cancel: () => {
			this.getters.cancel().click();
		},
	};
}
