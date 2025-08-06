/**
 * Getters
 */

export const getNpsSurvey = () => cy.getByTestId('nps-survey-modal');

export const getNpsSurveyRatings = () => cy.getByTestId('nps-survey-ratings');

export const getNpsSurveyFeedback = () => cy.getByTestId('nps-survey-feedback');
export const getNpsSurveySubmit = () => cy.getByTestId('nps-survey-feedback-button');

export const getNpsSurveyClose = () =>
	cy.getByTestId('nps-survey-modal').find('button.el-drawer__close-btn');

/**
 * Actions
 */
