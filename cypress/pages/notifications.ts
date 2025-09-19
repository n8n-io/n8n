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
	const notificationSelector = '.el-notification:has(.el-notification--success)';
	cy.get('body').then(($body) => {
		if ($body.find(notificationSelector).length) {
			cy.get(notificationSelector).each(($el) => {
				if ($el.find('.el-notification__closeBtn').length) {
					cy.wrap($el).find('.el-notification__closeBtn').click({ force: true });
				}
			});
		}
	});
};

// Clears notifications without asserting their existence
export const clearAnyNotifications = () => {
	const notificationSelector = '.el-notification:has(.el-notification--success)';
	cy.get('body')
		.should('have.length.gte', 0)
		.then(($body) => {
			if ($body.find(notificationSelector).length) {
				cy.get(notificationSelector).each(($el) => {
					if ($el.find('.el-notification__closeBtn').length) {
						cy.wrap($el).find('.el-notification__closeBtn').click({ force: true });
					}
				});
			}
		});
};
