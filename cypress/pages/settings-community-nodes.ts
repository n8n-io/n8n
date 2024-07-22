export const getCommunityCards = () => {
	return cy.getByTestId('community-package-card');
};

export const visitCommunityNodesSettings = () => {
	cy.visit('/settings/community-nodes');
};

export const installFirstCommunityNode = (nodeName: string) => {
	cy.getByTestId('action-box').find('button').click();
	cy.getByTestId('communityPackageInstall-modal').find('input').eq(0).type(nodeName);
	cy.getByTestId('user-agreement-checkbox').click();
	cy.getByTestId('install-community-package-button').click();
	cy.get('[data-test-id=communityPackageInstall-modal]').should('have.length.lte', 0);
};

export const confirmCommunityNodeUpdate = () => {
	cy.getByTestId('communityPackageManageConfirm-modal').find('button').eq(1).click();
	cy.get('[data-test-id=communityPackageManageConfirm-modal]').should('have.length.lte', 0);
};

export const confirmCommunityNodeUninstall = () => {
	cy.getByTestId('communityPackageManageConfirm-modal').find('button').eq(1).click();
};
