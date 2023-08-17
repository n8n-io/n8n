import { BasePage } from '../base';
import { WorkflowsPage } from '../workflows';

export class MainSidebar extends BasePage {
	getters = {
		menuItem: (menuLabel: string) =>
			cy.getByTestId('menu-item').filter(`:contains("${menuLabel}")`),
		settings: () => this.getters.menuItem('Settings'),
		templates: () => this.getters.menuItem('Templates'),
		workflows: () => this.getters.menuItem('Workflows'),
		credentials: () => this.getters.menuItem('Credentials'),
		executions: () => this.getters.menuItem('Executions'),
		userMenu: () => cy.get('div[class="action-dropdown-container"]'),
	};
	actions = {
		goToSettings: () => {
			this.getters.settings().should('be.visible');
			// We must wait before ElementUI menu is done with its animations
			cy.get('[data-old-overflow]').should('not.exist');
			this.getters.settings().click();
		},
		goToCredentials: () => {
			this.getters.credentials().should('be.visible');
			cy.get('[data-old-overflow]').should('not.exist');
			this.getters.credentials().click();
		},
		openUserMenu: () => {
			this.getters.userMenu().find('[role="button"]').last().click();
		},
		openUserMenu: () => {
			this.getters.userMenu().click();
		},
		signout: () => {
			const workflowsPage = new WorkflowsPage();
			cy.visit(workflowsPage.url);
			this.actions.openUserMenu();
			cy.getByTestId('user-menu-item-logout').click();
			cy.wrap(Cypress.session.clearAllSavedSessions());
		},
	};
}
