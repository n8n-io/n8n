export function getVisibleModalOverlay() {
	return cy.get('.el-overlay .el-overlay-dialog').filter(':visible');
}
