export function getPopper() {
	return cy.get('.el-popper');
}

export function getVisiblePopper() {
	return getPopper().filter(':visible');
}

export function getVisibleSelect() {
	return getVisiblePopper().filter('.el-select__popper');
}

export function getVisibleDropdown() {
	return getVisiblePopper().filter('.el-dropdown__popper');
}
