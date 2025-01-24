import { BasePage } from '../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
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
