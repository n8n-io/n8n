import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from "../constants";
import { randFirstName, randLastName } from "@ngneat/falso";
import { NodeCreator } from '../pages/features/nodeCreator';
import { INodeTypeDescription } from '../../packages/workflow';

const username = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const nodeCreatorFeature = new NodeCreator();

describe('Node Creator', () => {
	beforeEach(() => {
		cy.intercept('GET', '/types/nodes.json', req => {
			['etag', 'if-none-match', 'if-modified-since'].forEach(header => {delete req.headers[header]});
		}).as('nodesIntercept')

		cy.signup(username, firstName, lastName, password);

		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		})

		cy.signin(username, password);
		cy.visit(nodeCreatorFeature.url);
	});

	it('should open node creator on trigger tab if no trigger is on canvas', () => {
		nodeCreatorFeature.getters.canvasAddButton().click();

		nodeCreatorFeature.getters.nodeCreator().contains('When should this workflow run?').should('be.visible');

		nodeCreatorFeature.getters.nodeCreatorTabs().should('not.exist');
	})
	it('should see all tabs when opening via plus button', () => {
		nodeCreatorFeature.getters.plusButton().click();
		nodeCreatorFeature.getters.nodeCreatorTabs().should('exist');
		nodeCreatorFeature.getters.selectedTab().should('have.text', 'Trigger');
	});
	it('should navigate subcategory', () => {
		nodeCreatorFeature.getters.plusButton().click();
		nodeCreatorFeature.getters.getCreatorItem('On App Event').click();
		nodeCreatorFeature.getters.activeSubcategory().should('have.text', 'On App Event');
		// Go back
		nodeCreatorFeature.getters.activeSubcategory().find('button').click()
		nodeCreatorFeature.getters.activeSubcategory().should('not.exist');
	})
	it('should search for nodes', () => {
		nodeCreatorFeature.getters.plusButton().click();
		nodeCreatorFeature.getters.selectedTab().should('have.text', 'Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').type('manual');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 1);
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('manual123');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);
		nodeCreatorFeature.getters.noResults()
		.should('exist')
		.should('contain.text', 'We didn\'t make that... yet');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('edit image');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);
		nodeCreatorFeature.getters.noResults()
		.should('exist')
		.should('contain.text', 'To see results, click here');

		nodeCreatorFeature.getters.noResults().contains('click here').click();
		nodeCreatorFeature.getters.nodeCreatorTabs().should('exist');
		nodeCreatorFeature.getters.getCreatorItem('Edit Image').should('exist');
		nodeCreatorFeature.getters.selectedTab().should('have.text', 'All');
		nodeCreatorFeature.getters.searchBar().find('button').click();
		nodeCreatorFeature.getters.searchBar().find('input').should('be.empty')
	})

	it('should add manul trigger node', () => {
		nodeCreatorFeature.getters.canvasAddButton().click();
		nodeCreatorFeature.getters.getCreatorItem('Manually').click();

		// TODO: Replace once we have canvas feature utils
		cy.get('span').contains('Back to canvas').click();

		nodeCreatorFeature.getters.canvasAddButton().should('not.be.visible');
		nodeCreatorFeature.getters.nodeCreator().should('not.exist');

		// TODO: Replace once we have canvas feature utils
		cy.get('div').contains("On clicking 'execute'").should('exist');
	})

	it('check if non-core nodes are rendered all nodes', () => {
		cy.wait('@nodesIntercept').then((interception) => {
			const nodes = interception.response?.body as INodeTypeDescription[];

			const categorizedNodes = nodeCreatorFeature.actions.categorizeNodes(nodes);
			nodeCreatorFeature.getters.plusButton().click();
			nodeCreatorFeature.getters.nodeCreatorTabs().contains('All').click();

			const categories = Object.keys(categorizedNodes);
			categories.forEach((category: string) => {
				// Core Nodes contains subcategories which we'll test separately
				if(category === 'Core Nodes') return;

				nodeCreatorFeature.getters.categorizedItems().contains(category).click()

				// Check if all nodes are present
				categorizedNodes[category].forEach((node: INodeTypeDescription) => {
					if(node.hidden) return;
					nodeCreatorFeature.getters.categorizedItems().contains(node.displayName).should('exist');
				})

				nodeCreatorFeature.getters.categorizedItems().contains(category).click()
			})
		})
	})
});
