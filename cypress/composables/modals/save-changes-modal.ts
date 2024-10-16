export function getSaveChangesModal() {
	return cy.get('.el-overlay').contains('Save changes before leaving?');
}
