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
};

export const confirmCommunityNodeUpdate = () => {
	cy.getByTestId('communityPackageManageConfirm-modal').find('button').eq(1).click();
};

export const confirmCommunityNodeUninstall = () => {
	cy.getByTestId('communityPackageManageConfirm-modal').find('button').eq(1).click();
};
