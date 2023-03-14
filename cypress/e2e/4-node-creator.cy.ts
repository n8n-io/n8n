import { NodeCreator } from '../pages/features/node-creator';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';

const nodeCreatorFeature = new NodeCreator();
const WorkflowPage = new WorkflowPageClass();
const NDVModal = new NDV();


describe('Node Creator', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		WorkflowPage.actions.visit();
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
		nodeCreatorFeature.getters.searchBar().find('input').type('{rightarrow}');
		nodeCreatorFeature.getters.activeSubcategory().should('have.text', 'FTP');
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('file');
		// Navigate to rename action which should be the 4th item
		nodeCreatorFeature.getters.searchBar().find('input').type('{downarrow} {downarrow} {downarrow} {rightarrow}');
		NDVModal.getters.parameterInput('operation').should('contain.text', 'Rename');
	})

	describe('should correctly append manual trigger for regular actions', () => {
		// For these sources, manual node should be added
		const sourcesWithAppend = [
			{
				name: 'canvas add button',
				handler: () => nodeCreatorFeature.getters.canvasAddButton().click(),
			}, {
				name: 'plus button',
				handler: () => nodeCreatorFeature.getters.plusButton().click(),
			},
			// We can't test this one because it's not possible to trigger tab key in Cypress
			// only way is to use `realPress` which is hanging the tests in Electron for some reason
			// {
			// 	name: 'tab key',
			// 	handler: () => cy.realPress('Tab'),
			// },
		]
		sourcesWithAppend.forEach((source) => {
			it(`should append manual trigger when source is ${source.name}`, () => {
				source.handler()
				nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
				nodeCreatorFeature.getters.getCreatorItem('n8n').click();
				nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
				NDVModal.actions.close();
				WorkflowPage.getters.canvasNodes().should('have.length', 2);
			});
		});

		it('should not append manual trigger when source is canvas related', () => {
			nodeCreatorFeature.getters.canvasAddButton().click();
			nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
			nodeCreatorFeature.getters.getCreatorItem('n8n').click();
			nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
			NDVModal.actions.close();
			WorkflowPage.actions.deleteNode('When clicking "Execute Workflow"')
			WorkflowPage.getters.canvasNodePlusEndpointByName('n8n').click()
			nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
			nodeCreatorFeature.getters.getCreatorItem('n8n').click();
			nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
			NDVModal.actions.close();
			WorkflowPage.getters.canvasNodes().should('have.length', 2);
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.actions.addNodeBetweenNodes('n8n', 'n8n1', 'Item Lists')
			WorkflowPage.getters.canvasNodes().should('have.length', 3);
		})
	});
});
