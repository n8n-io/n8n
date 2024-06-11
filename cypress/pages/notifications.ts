type CyGetOptions = Parameters<(typeof cy)['get']>[1];

/**
 * Getters
 */
export const successToast = () => cy.get('.el-notification:has(.el-notification--success)');
export const warningToast = () => cy.get('.el-notification:has(.el-notification--warning)');
export const errorToast = (options?: CyGetOptions) =>
	cy.get('.el-notification:has(.el-notification--error)', options);
export const infoToast = () => cy.get('.el-notification:has(.el-notification--info)');

/**
 * Actions
 */
export const clearNotifications = () => {
	successToast().find('.el-notification__closeBtn').click({ multiple: true });
};
