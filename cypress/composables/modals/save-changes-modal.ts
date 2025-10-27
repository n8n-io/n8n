export function getSaveChangesModal() {
	return cy.get('.el-overlay').contains('Save changes before leaving?');
}

// this is the button next to 'Save Changes'
export function getCancelSaveChangesButton() {
	return cy.get('.btn--cancel');
}

// This is the top right 'x'
export function getCloseSaveChangesButton() {
	return cy.get('.el-message-box__headerbtn');
}
