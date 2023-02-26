import { BasePage } from '../base';
import { INodeTypeDescription } from 'n8n-workflow';

export class NodeCreator extends BasePage {
	url = '/workflow/new';
	getters = {
		plusButton: () => cy.getByTestId('node-creator-plus-button'),
		canvasAddButton: () => cy.getByTestId('canvas-add-button'),
		searchBar: () => cy.getByTestId('search-bar'),
		getCreatorItem: (label: string) =>
			this.getters.creatorItem().contains(label).parents('[data-test-id="item-iterator-item"]'),
		getNthCreatorItem: (n: number) => this.getters.creatorItem().eq(n),
		nodeCreator: () => cy.getByTestId('node-creator'),
		nodeCreatorTabs: () => cy.getByTestId('node-creator-type-selector'),
		selectedTab: () => this.getters.nodeCreatorTabs().find('.is-active'),
		categorizedItems: () => cy.getByTestId('categorized-items'),
		creatorItem: () => cy.getByTestId('item-iterator-item'),
		communityNodeTooltip: () => cy.getByTestId('node-item-community-tooltip'),
		noResults: () => cy.getByTestId('categorized-no-results'),
		nodeItemName: () => cy.getByTestId('node-creator-item-name'),
		activeSubcategory: () => cy.getByTestId('categorized-items-subcategory'),
		expandedCategories: () =>
			this.getters.creatorItem().find('>div').filter('.active').invoke('text'),
	};
	actions = {
		openNodeCreator: () => {
			cy.waitForLoad();
			this.getters.plusButton().click();
			this.getters.nodeCreator().should('be.visible');
		},
		selectNode: (displayName: string) => {
			this.getters.getCreatorItem(displayName).click();
		},
		toggleCategory: (category: string) => {
			this.getters.getCreatorItem(category).click();
		},
		categorizeNodes: (nodes: INodeTypeDescription[]) => {
			const categorizedNodes = nodes.reduce((acc, node) => {
				const categories = (node?.codex?.categories || []).map((category: string) =>
					category.trim(),
				);

				categories.forEach((category: { [key: string]: INodeTypeDescription[] }) => {
					// Node creator should show only the latest version of a node
					const newerVersion = nodes.find(
						(n: INodeTypeDescription) =>
							n.name === node.name && (n.version > node.version || Array.isArray(n.version)),
					);

					if (acc[category] === undefined) {
						acc[category] = [];
					}
					acc[category].push(newerVersion ?? node);
				});
				return acc;
			}, {});

			return categorizedNodes;
		},
	};
}
