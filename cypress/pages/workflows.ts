import { BasePage } from './base';

export class WorkflowsPage extends BasePage {
	url = '/home/workflows';

	getters = {
		newWorkflowButtonCard: () => cy.getByTestId('new-workflow-card'),
		newWorkflowTemplateCard: () => cy.getByTestId('new-workflow-template-card'),
		searchBar: () => cy.getByTestId('resources-list-search'),
		createWorkflowButton: () => {
			cy.getByTestId('resource-add').should('be.visible').click();
			cy.getByTestId('resource-add')
				.find('.el-sub-menu__title')
				.as('menuitem')
				.should('have.attr', 'aria-describedby');

			cy.get('@menuitem')
				.should('be.visible')
				.invoke('attr', 'aria-describedby')
				.then((el) => cy.get(`[id="${el}"]`))
				.as('submenu');

			cy.get('@submenu')
				.should('be.visible')
				.within((submenu) => {
					// If submenu has another submenu
					if (submenu.find('[data-test-id="navigation-submenu"]').length) {
						cy.wrap(submenu)
							.find('[data-test-id="navigation-submenu"]')
							.should('be.visible')
							.filter(':contains("Workflow")')
							.as('child')
							.click();

						cy.get('@child')
							.should('be.visible')
							.find('[data-test-id="navigation-submenu-item"]')
							.should('be.visible')
							.filter(':contains("Personal")')
							.as('button');
					} else {
						cy.wrap(submenu)
							.find('[data-test-id="navigation-menu-item"]')
							.filter(':contains("Workflow")')
							.as('button');
					}
				});

			return cy.get('@button').should('be.visible');
		},
		workflowCards: () => cy.getByTestId('resources-list-item'),
		workflowCard: (workflowName: string) =>
			this.getters
				.workflowCards()
				.contains(workflowName)
				.parents('[data-test-id="resources-list-item"]'),
		workflowTags: (workflowName: string) =>
			this.getters.workflowCard(workflowName).findChildByTestId('workflow-card-tags'),
		workflowCardContent: (workflowName: string) =>
			this.getters.workflowCard(workflowName).findChildByTestId('card-content'),
		workflowActivator: (workflowName: string) =>
			this.getters.workflowCard(workflowName).findChildByTestId('workflow-card-activator'),
		workflowActivatorStatus: (workflowName: string) =>
			this.getters.workflowActivator(workflowName).findChildByTestId('workflow-activator-status'),
		workflowCardActions: (workflowName: string) =>
			this.getters.workflowCard(workflowName).findChildByTestId('workflow-card-actions'),
		workflowDeleteButton: () =>
			cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Delete'),
		workflowMoveButton: () =>
			cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Move'),
		workflowFilterButton: () => cy.getByTestId('resources-list-filters-trigger').filter(':visible'),
		workflowTagsDropdown: () => cy.getByTestId('tags-dropdown'),
		workflowTagItem: (tag: string) => cy.getByTestId('tag').contains(tag),
		workflowStatusDropdown: () => cy.getByTestId('status-dropdown'),
		workflowStatusItem: (status: string) => cy.getByTestId('status').contains(status),
		workflowOwnershipDropdown: () => cy.getByTestId('user-select-trigger'),
		workflowOwner: (email: string) => cy.getByTestId('user-email').contains(email),
		workflowResetFilters: () => cy.getByTestId('workflows-filter-reset'),
		// Not yet implemented
		// myWorkflows: () => cy.getByTestId('my-workflows'),
		// allWorkflows: () => cy.getByTestId('all-workflows'),
	};

	actions = {
		createWorkflowFromCard: () => {
			this.getters.newWorkflowButtonCard().click();
		},
		deleteWorkFlow: (name: string) => {
			cy.visit(this.url);
			this.getters.workflowCardActions(name).click();
			this.getters.workflowDeleteButton().click();
			cy.intercept('DELETE', '/rest/workflows/*').as('deleteWorkflow');

			cy.get('button').contains('delete').click();
			cy.wait('@deleteWorkflow');
		},
	};
}
