/**
 * Getters
 */

export const getNpsSurvey = () => cy.getByTestId('nps-survey-modal');

export const getNpsSurveyRatings = () => cy.getByTestId('nps-survey-ratings');

export const getNpsSurveyEmail = () => cy.getByTestId('nps-survey-email');

export const getNpsSurveyClose = () =>
	cy.getByTestId('nps-survey-modal').find('button.el-drawer__close-btn');

/**
 * Actions
 */
