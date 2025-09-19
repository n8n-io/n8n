import { BasePage } from '../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class NodeCreator extends BasePage {
	url = '/workflow/new';

	getters = {
		plusButton: () => cy.getByTestId('node-creator-plus-button'),
		canvasAddButton: () => cy.getByTestId('canvas-add-button'),
		searchBar: () => cy.getByTestId('search-bar'),
		getCategoryItem: (label: string) => cy.get(`[data-keyboard-nav-id="${label}"]`),
		getCreatorItem: (label: string) =>
			this.getters.creatorItem().contains(label).parents('[data-test-id="item-iterator-item"]'),
		getNthCreatorItem: (n: number) => this.getters.creatorItem().eq(n),
		nodeCreator: () => cy.getByTestId('node-creator'),
		nodeCreatorTabs: () => cy.getByTestId('node-creator-type-selector'),
		selectedTab: () => this.getters.nodeCreatorTabs().find('.is-active'),
		categorizedItems: () => cy.getByTestId('categorized-items'),
		creatorItem: () => cy.getByTestId('item-iterator-item'),
		categoryItem: () => cy.getByTestId('node-creator-category-item'),
		communityNodeTooltip: () => cy.getByTestId('node-item-community-tooltip'),
		noResults: () => cy.getByTestId('node-creator-no-results'),
		nodeItemName: () => cy.getByTestId('node-creator-item-name'),
		nodeItemDescription: () => cy.getByTestId('node-creator-item-description'),
		activeSubcategory: () => cy.getByTestId('nodes-list-header'),
		expandedCategories: () =>
			this.getters.creatorItem().find('>div').filter('.active').invoke('text'),
	};

	actions = {
		openNodeCreator: () => {
			this.getters.plusButton().click();
			this.getters.nodeCreator().should('be.visible');
		},
		selectNode: (displayName: string) => {
			this.getters.getCreatorItem(displayName).click();
		},
	};
}
