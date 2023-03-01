import { NodeCreator } from '../pages/features/node-creator';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { randFirstName, randLastName } from '@ngneat/falso';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const nodeCreatorFeature = new NodeCreator();
const WorkflowPage = new WorkflowPageClass();
const NDVModal = new NDV();

describe('Node Creator', () => {
	before(() => {
		cy.resetAll();
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.signin({ email, password });

		cy.visit(nodeCreatorFeature.url);
		cy.waitForLoad();
	});

	it('should open node creator on trigger tab if no trigger is on canvas', () => {
		nodeCreatorFeature.getters.canvasAddButton().click();

		nodeCreatorFeature.getters.nodeCreator().contains('Select a trigger').should('be.visible');
	});

	it('should navigate subcategory', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.getCreatorItem('On app event').click();
		nodeCreatorFeature.getters.activeSubcategory().should('have.text', 'On app event');
		// Go back
		nodeCreatorFeature.getters.activeSubcategory().find('button').click();
		nodeCreatorFeature.getters.activeSubcategory().should('not.have.text', 'On app event');
	});

	it('should search for nodes', () => {
		nodeCreatorFeature.actions.openNodeCreator();

		nodeCreatorFeature.getters.searchBar().find('input').type('manual');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 1);
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('manual123');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);
		nodeCreatorFeature.getters
			.noResults()
			.should('exist')
			.should('contain.text', "We didn't make that... yet");

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('edit image');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 1);

		nodeCreatorFeature.getters
			.searchBar()
			.find('input')
			.clear()
			.type('this node totally does not exist');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);

		nodeCreatorFeature.getters.searchBar().find('input').clear();
		nodeCreatorFeature.getters.getCreatorItem('On app event').click();

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('edit image');
		nodeCreatorFeature.getters.getCreatorItem('Results in other categories (1)').should('exist');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 2);
		nodeCreatorFeature.getters.getCreatorItem('Edit Image').should('exist');
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('edit image123123');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 0);
	});

	it('should check correct view panels', () => {
		nodeCreatorFeature.getters.canvasAddButton().click();
		WorkflowPage.actions.addNodeToCanvas('Manual', false);

		nodeCreatorFeature.getters.canvasAddButton().should('not.be.visible');
		nodeCreatorFeature.getters.nodeCreator().should('not.exist');

		// TODO: Replace once we have canvas feature utils
		cy.get('div').contains('Add first step').should('be.hidden');
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.nodeCreator().contains('What happens next?').should('be.visible');

		nodeCreatorFeature.getters.getCreatorItem('Add another trigger').click();
		nodeCreatorFeature.getters.nodeCreator().contains('Select a trigger').should('be.visible');
		nodeCreatorFeature.getters.activeSubcategory().find('button').should('exist');
		nodeCreatorFeature.getters.activeSubcategory().find('button').click();
		nodeCreatorFeature.getters.nodeCreator().contains('What happens next?').should('be.visible');
	});

	it('should add node to canvas from actions panel', () => {
		const editImageNode = 'Edit Image';
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type(editImageNode);
		nodeCreatorFeature.getters.getCreatorItem(editImageNode).click();
		nodeCreatorFeature.getters.activeSubcategory().should('have.text', editImageNode);
		nodeCreatorFeature.getters.getCreatorItem('Crop Image').click();
		NDVModal.getters.parameterInput('operation').should('contain.text', 'Crop');
	});

	it('should search through actions and confirm added action', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('ftp');
		nodeCreatorFeature.getters.searchBar().find('input').realPress('{rightarrow}');
		nodeCreatorFeature.getters.activeSubcategory().should('have.text', 'FTP');
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('file');
		// Navigate to rename action which should be the 4th item
		nodeCreatorFeature.getters.searchBar().find('input').realPress('{downarrow}');
		nodeCreatorFeature.getters.searchBar().find('input').realPress('{downarrow}');
		nodeCreatorFeature.getters.searchBar().find('input').realPress('{downarrow}');
		nodeCreatorFeature.getters.searchBar().find('input').realPress('{rightarrow}');
		NDVModal.getters.parameterInput('operation').should('contain.text', 'Rename');
	})

	it('should render and select community node', () => {
		cy.intercept('GET', '/types/nodes.json').as('nodesIntercept');
		cy.wait('@nodesIntercept').then(() => {
			const customNode = 'E2E Node';

			nodeCreatorFeature.actions.openNodeCreator();
			nodeCreatorFeature.getters.searchBar().find('input').clear().type(customNode);

			nodeCreatorFeature.getters
				.getCreatorItem(customNode)
				.findChildByTestId('node-creator-item-tooltip')
				.should('exist');
			nodeCreatorFeature.actions.selectNode(customNode);

			// TODO: Replace once we have canvas feature utils
			cy.get('.data-display .node-name').contains(customNode).should('exist');

			const nodeParameters = () => cy.getByTestId('node-parameters');
			const firstParameter = () => nodeParameters().find('.parameter-item').eq(0);
			const secondParameter = () => nodeParameters().find('.parameter-item').eq(1);

			// Check correct fields are rendered
			nodeParameters().should('exist');
			// Test property text input
			firstParameter().contains('Test property').should('exist');
			firstParameter().find('input.el-input__inner').should('have.value', 'Some default');
			// Resource select input
			secondParameter().find('label').contains('Resource').should('exist');
			secondParameter().find('input.el-input__inner').should('have.value', 'option2');
			secondParameter().find('.el-select').click();
			secondParameter().find('.el-select-dropdown__list').should('exist');
			// Check if all options are rendered and select the fourth one
			secondParameter().find('.el-select-dropdown__list').children().should('have.length', 4);
			secondParameter()
				.find('.el-select-dropdown__list')
				.children()
				.eq(3)
				.contains('option4')
				.should('exist')
				.click();
			secondParameter().find('input.el-input__inner').should('have.value', 'option4');
		});
	});
});
