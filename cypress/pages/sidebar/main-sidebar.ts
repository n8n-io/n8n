import { BasePage } from '../base';
import { WorkflowsPage } from '../workflows';

const workflowsPage = new WorkflowsPage();

export class MainSidebar extends BasePage {
	getters = {
		menuItem: (id: string) => cy.getByTestId('menu-item').get('#' + id),
		settings: () => this.getters.menuItem('settings'),
		settingsBack: () => cy.getByTestId('settings-back'),
		templates: () => this.getters.menuItem('templates'),
		workflows: () => this.getters.menuItem('workflows'),
		credentials: () => this.getters.menuItem('credentials'),
		executions: () => this.getters.menuItem('executions'),
		adminPanel: () => this.getters.menuItem('cloud-admin'),
		userMenu: () => cy.get('div[class="action-dropdown-container"]'),
		logo: () => cy.getByTestId('n8n-logo'),
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
			this.getters.userMenu().click();
		},
		closeSettings: () => {
			this.getters.settingsBack().click();
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
