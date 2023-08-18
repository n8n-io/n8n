export function getVisiblePopper() {
	return cy.get('.el-popper').filter(':visible');
}

export function getVisibleSelect() {
	return getVisiblePopper().filter('.el-select__popper');
}

export function getVisibleDropdown() {
	return getVisiblePopper().filter('.el-dropdown__popper');
}
