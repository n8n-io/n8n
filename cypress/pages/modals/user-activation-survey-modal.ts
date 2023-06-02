import { BasePage } from './../base';

export class UserActivationSurveyModal extends BasePage {
	getters = {
		modalContainer: () => cy.getByTestId('userActivationSurvey-modal').last(),
		feedbackInput: () => cy.getByTestId('activation-feedback-input').find('textarea'),
		sendFeedbackButton: () => cy.getByTestId('send-activation-feedback-button'),
		skipButton: () => cy.getByTestId('skip-button'),
	};
}
