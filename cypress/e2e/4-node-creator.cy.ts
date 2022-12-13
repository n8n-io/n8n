import { NodeCreator } from '../pages/features/node-creator';
import { INodeTypeDescription } from '../../packages/workflow';
import CustomNodeFixture from '../fixtures/Custom_node.json';
import {DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD} from "../constants";
import {randFirstName, randLastName} from "@ngneat/falso";

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const nodeCreatorFeature = new NodeCreator();

describe('Node Creator', () => {
	before(() => {
		cy.resetAll();
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.signin({ email, password });

		cy.intercept('GET', '/types/nodes.json', (req) => {
			// Delete caching headers so that we can intercept the request
			['etag', 'if-none-match', 'if-modified-since'].forEach(header => {delete req.headers[header]});


			req.continue((res) => {
				const nodes = res.body as INodeTypeDescription[];

				nodes.push(CustomNodeFixture as INodeTypeDescription);
				res.send(nodes)
			})
		}).as('nodesIntercept');

		cy.visit(nodeCreatorFeature.url);
	});

	it('should open node creator on trigger tab if no trigger is on canvas', () => {
		nodeCreatorFeature.getters.canvasAddButton().click();

		nodeCreatorFeature.getters.nodeCreator().contains('When should this workflow run?').should('be.visible');

		nodeCreatorFeature.getters.nodeCreatorTabs().should('not.exist');
	})

	it('should see all tabs when opening via plus button', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.nodeCreatorTabs().should('exist');
		nodeCreatorFeature.getters.selectedTab().should('have.text', 'Trigger');
	});

	it('should navigate subcategory', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.getCreatorItem('On App Event').click();
		nodeCreatorFeature.getters.activeSubcategory().should('have.text', 'On App Event');
		// Go back
		nodeCreatorFeature.getters.activeSubcategory().find('button').click()
		nodeCreatorFeature.getters.activeSubcategory().should('not.exist');
	})

	it('should search for nodes', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.selectedTab().should('have.text', 'Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').type('manual');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 1);
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('manual123');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);
		nodeCreatorFeature.getters.noResults()
		.should('exist')
		.should('contain.text', 'We didn\'t make that... yet');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('edit image');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 1);

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('this node totally does not exist');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);

		nodeCreatorFeature.getters.searchBar().find('input').clear()
		nodeCreatorFeature.getters.getCreatorItem('On App Event').click();

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('edit image');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);
		nodeCreatorFeature.getters.noResults()
		.should('exist')
		.should('contain.text', 'To see all results, click here');

		nodeCreatorFeature.getters.noResults().contains('click here').click();
		nodeCreatorFeature.getters.nodeCreatorTabs().should('exist');
		nodeCreatorFeature.getters.getCreatorItem('Edit Image').should('exist');
		nodeCreatorFeature.getters.selectedTab().should('have.text', 'All');
		nodeCreatorFeature.getters.searchBar().find('button').click();
		nodeCreatorFeature.getters.searchBar().find('input').should('be.empty')
	})

	it('should add manual trigger node', () => {
		cy.get('.el-loading-mask').should('not.exist');
		nodeCreatorFeature.getters.canvasAddButton().click();
		nodeCreatorFeature.getters.getCreatorItem('Manually').click();

		// TODO: Replace once we have canvas feature utils
		cy.get('span').contains('Back to canvas').click();

		nodeCreatorFeature.getters.canvasAddButton().should('not.be.visible');
		nodeCreatorFeature.getters.nodeCreator().should('not.exist');

		// TODO: Replace once we have canvas feature utils
		cy.get('div').contains("Add first step").should('exist');
	})
	it('check if non-core nodes are rendered', () => {
		cy.wait('@nodesIntercept').then((interception) => {
			const nodes = interception.response?.body as INodeTypeDescription[];

			const categorizedNodes = nodeCreatorFeature.actions.categorizeNodes(nodes);
			nodeCreatorFeature.actions.openNodeCreator();
			nodeCreatorFeature.actions.selectTab('All');

			const categories = Object.keys(categorizedNodes);
			categories.forEach((category: string) => {
				// Core Nodes contains subcategories which we'll test separately
				if(category === 'Core Nodes') return;

				nodeCreatorFeature.actions.toggleCategory(category)

				// Check if all nodes are present
				nodeCreatorFeature.getters.nodeItemName().then($elements => {
					const visibleNodes: string[] = [];
					$elements.each((_, element) => {
						visibleNodes.push(element.textContent?.trim() || '');
					})
					const visibleCategoryNodes = (categorizedNodes[category] as INodeTypeDescription[])
						.filter(node => !node.hidden)
						.map(node => node.displayName?.trim());

					cy.wrap(visibleCategoryNodes).each((categoryNode: string) => {
						expect(visibleNodes).to.include(categoryNode);
					});
				})

				nodeCreatorFeature.actions.toggleCategory(category)
			})
		})
	})

	it('should render and select community node', () => {
		cy.wait('@nodesIntercept').then(() => {
			const customCategory = 'Custom Category';
			const customNode = 'E2E Node';
			const customNodeDescription = 'Demonstrate rendering of node';

			nodeCreatorFeature.actions.openNodeCreator();
			nodeCreatorFeature.actions.selectTab('All');

			nodeCreatorFeature.getters.getCreatorItem(customCategory).should('exist');

			nodeCreatorFeature.actions.toggleCategory(customCategory);
			nodeCreatorFeature.getters.getCreatorItem(customNode).findChildByTestId('node-creator-item-tooltip').should('exist');
			nodeCreatorFeature.getters.getCreatorItem(customNode).contains(customNodeDescription).should('exist');
			nodeCreatorFeature.actions.selectNode(customNode);

			// TODO: Replace once we have canvas feature utils
			cy.get('.data-display .node-name').contains(customNode).should('exist');

			const nodeParameters = () => cy.getByTestId('node-parameters')
			const firstParameter = () => nodeParameters().find('.parameter-item').eq(0);
			const secondParameter = () => nodeParameters().find('.parameter-item').eq(1);

			// Check correct fields are rendered
			nodeParameters().should('exist')
			// Test property text input
			firstParameter().contains('Test property').should('exist');
			firstParameter().find('input.el-input__inner').should('have.value', 'Some default');
			// Resource select input
			secondParameter().find('label').contains('Resource').should('exist');
			secondParameter().find('input.el-input__inner').should('have.value', 'option2');
			secondParameter().find('.el-select').click();
			secondParameter().find('.el-select-dropdown__list').should('exist')
			// Check if all options are rendered and select the fourth one
			secondParameter().find('.el-select-dropdown__list').children().should('have.length', 4);
			secondParameter().find('.el-select-dropdown__list').children().eq(3).contains('option4').should('exist').click();
			secondParameter().find('input.el-input__inner').should('have.value', 'option4');
		})
	})
});
