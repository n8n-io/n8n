import { BasePage } from "../base";

export class NodeCreator extends BasePage {
	url = '/workflow/new';
	getters = {
		plusButton: () => cy.getByTestId('node-creation-plus'),
		canvasAddButton: () => cy.getByTestId('canvas-add-button'),
		searchBar: () => cy.getByTestId('search-bar'),
		getCreatorItem: (label: string) => this.getters.creatorItem().contains(label).parents('[data-test-id="item-iterator-item"]'),
		getNthCreatorItem: (n: number) => this.getters.creatorItem().eq(n),
		nodeCreator: () => cy.getByTestId('node-creator'),
		nodeCreatorTabs: () => cy.getByTestId('node-creator-type-selector'),
		selectedTab: () => this.getters.nodeCreatorTabs().find('.is-active'),
		categorizedItems: () => cy.getByTestId('categorized-items'),
		creatorItem: () => cy.getByTestId('item-iterator-item'),
		noResults: () => cy.getByTestId('categorized-no-results'),
		activeSubcategory: () => cy.getByTestId('categorized-items-subcategory'),
	};
	actions = {
		openNodeCreator: () => {
			this.getters.plusButton().click();
			this.getters.nodeCreator().should('be.visible')
		},
		selectNthNode: (n: number) => {
			this.getters.getNthCreatorItem(n).click();
		},
	};
}
