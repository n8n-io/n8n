// Getters
export const nodeCreatorPlusButton = () => cy.getByTestId('node-creator-plus-button');
export const canvasAddButton = () => cy.getByTestId('canvas-add-button');
export const searchBar = () => cy.getByTestId('search-bar');
export const getCategoryItem = (label: string) => cy.get(`[data-keyboard-nav-id="${label}"]`);
export const getCreatorItem = (label: string) =>
	getCreatorItems().contains(label).parents('[data-test-id="item-iterator-item"]');
export const getNthCreatorItem = (n: number) => getCreatorItems().eq(n);
export const nodeCreator = () => cy.getByTestId('node-creator');
export const nodeCreatorTabs = () => cy.getByTestId('node-creator-type-selector');
export const selectedTab = () => nodeCreatorTabs().find('.is-active');
export const categorizedItems = () => cy.getByTestId('categorized-items');
export const getCreatorItems = () => cy.getByTestId('item-iterator-item');
export const categoryItem = () => cy.getByTestId('node-creator-category-item');
export const communityNodeTooltip = () => cy.getByTestId('node-item-community-tooltip');
export const noResults = () => cy.getByTestId('node-creator-no-results');
export const nodeItemName = () => cy.getByTestId('node-creator-item-name');
export const nodeItemDescription = () => cy.getByTestId('node-creator-item-description');
export const activeSubcategory = () => cy.getByTestId('nodes-list-header');
export const expandedCategories = () =>
	getCreatorItems().find('>div').filter('.active').invoke('text');

// Actions
export const openNodeCreator = () => {
	nodeCreatorPlusButton().click();
	nodeCreator().should('be.visible');
};

export const selectNode = (displayName: string) => {
	getCreatorItem(displayName).click();
};
