import { NodeCreator } from '../pages/features/node-creator';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';

const nodeCreatorFeature = new NodeCreator();
const WorkflowPage = new WorkflowPageClass();
const NDVModal = new NDV();

describe('Node Creator', () => {
	before(() => {
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
		nodeCreatorFeature.getters.getCategoryItem('Results in other categories').should('exist');
		nodeCreatorFeature.getters.creatorItem().should('have.length', 1);
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
		nodeCreatorFeature.getters.searchBar().find('input').type('{uparrow}{uparrow}{rightarrow}');
		NDVModal.getters.parameterInput('operation').should('contain.text', 'Rename');
	})

	it('should not show actions for single action nodes', () => {
		const singleActionNodes = [
			'DHL',
			'iCalendar',
			'LingvaNex',
			'Mailcheck',
			'MSG91',
			'OpenThesaurus',
			'Spontit',
			'Vonage',
			'Send Email',
			'Toggl Trigger'
		]
		const doubleActionNode = 'OpenWeatherMap'

		nodeCreatorFeature.actions.openNodeCreator();
		singleActionNodes.forEach((node) => {
			nodeCreatorFeature.getters.searchBar().find('input').clear().type(node);
			nodeCreatorFeature.getters.getCreatorItem(node).find('button[class*="panelIcon"]').should('not.exist');
		})
		nodeCreatorFeature.getters.searchBar().find('input').clear().type(doubleActionNode);
		nodeCreatorFeature.getters.getCreatorItem(doubleActionNode).click();
		nodeCreatorFeature.getters.creatorItem().should('have.length', 4);
	})

	it('should have "Actions" section collapsed when opening actions view from Trigger root view', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('ActiveCampaign');
		nodeCreatorFeature.getters.getCreatorItem('ActiveCampaign').click();
		nodeCreatorFeature.getters.getCategoryItem('Actions').should('exist');
		nodeCreatorFeature.getters.getCategoryItem('Triggers').should('exist');

		nodeCreatorFeature.getters.getCategoryItem('Triggers').parent().should('not.have.attr', 'data-category-collapsed');
		nodeCreatorFeature.getters.getCategoryItem('Actions').parent().should('have.attr', 'data-category-collapsed', 'true');
		nodeCreatorFeature.getters.getCategoryItem('Actions').click()
		nodeCreatorFeature.getters.getCategoryItem('Actions').parent().should('not.have.attr', 'data-category-collapsed');
	});

	it('should have "Triggers" section collapsed when opening actions view from Regular root view', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.getCreatorItem('Manually').click();

		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
		nodeCreatorFeature.getters.getCreatorItem('n8n').click();

		nodeCreatorFeature.getters.getCategoryItem('Actions').parent().should('not.have.attr', 'data-category-collapsed');
		nodeCreatorFeature.getters.getCategoryItem('Actions').click()
		nodeCreatorFeature.getters.getCategoryItem('Actions').parent().should('have.attr', 'data-category-collapsed');
		nodeCreatorFeature.getters.getCategoryItem('Triggers').parent().should('have.attr', 'data-category-collapsed');
		nodeCreatorFeature.getters.getCategoryItem('Triggers').click()
		nodeCreatorFeature.getters.getCategoryItem('Triggers').parent().should('not.have.attr', 'data-category-collapsed');
	});

	it('should show callout and two suggested nodes if node has no trigger actions', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();

		cy.getByTestId('actions-panel-no-triggers-callout').should('be.visible');
		nodeCreatorFeature.getters.getCreatorItem('On a Schedule').should('be.visible');
		nodeCreatorFeature.getters.getCreatorItem('On a Webhook call').should('be.visible');
	});

	it('should show intro callout if user has not made a production execution', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();

		cy.getByTestId('actions-panel-activation-callout').should('be.visible');
		nodeCreatorFeature.getters.activeSubcategory().find('button').click();
		nodeCreatorFeature.getters.searchBar().find('input').clear()

		nodeCreatorFeature.getters.getCreatorItem('On a schedule').click();

		// Setup 1s interval execution
		cy.getByTestId('parameter-input-field').click();
		cy.getByTestId('parameter-input-field')
			.find('.el-select-dropdown')
			.find('.option-headline')
			.contains('Seconds')
			.click();
		cy.getByTestId('parameter-input-secondsInterval').clear().type('1');

		NDVModal.actions.close();

		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();
		nodeCreatorFeature.getters.getCreatorItem('Get All People').click();
		NDVModal.actions.close();

		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();
		WorkflowPage.getters.activatorSwitch().should('have.class', 'is-checked');

		// Wait for schedule 1s execution to mark user as having made a production execution
		cy.wait(1500);
		cy.reload()

		// Action callout should not be visible after user has made a production execution
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();

		cy.getByTestId('actions-panel-activation-callout').should('not.exist');
	});

	it('should show Trigger and Actions sections during search', () => {
		nodeCreatorFeature.actions.openNodeCreator();

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Non existent action name');

		nodeCreatorFeature.getters.getCategoryItem('Triggers').should('be.visible');
		nodeCreatorFeature.getters.getCategoryItem('Actions').should('be.visible');
		cy.getByTestId('actions-panel-no-triggers-callout').should('be.visible');
		nodeCreatorFeature.getters.getCreatorItem('On a Schedule').should('be.visible');
		nodeCreatorFeature.getters.getCreatorItem('On a Webhook call').should('be.visible');
	});

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
				nodeCreatorFeature.getters.getCategoryItem('Actions').click();
				nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
				NDVModal.actions.close();
				WorkflowPage.getters.canvasNodes().should('have.length', 2);
			});
		});

		it('should not append manual trigger when source is canvas related', () => {
			nodeCreatorFeature.getters.canvasAddButton().click();
			nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
			nodeCreatorFeature.getters.getCreatorItem('n8n').click();
			nodeCreatorFeature.getters.getCategoryItem('Actions').click();
			nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
			NDVModal.actions.close();
			WorkflowPage.actions.deleteNode('When clicking "Execute Workflow"')
			WorkflowPage.getters.canvasNodePlusEndpointByName('n8n').click()
			nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
			nodeCreatorFeature.getters.getCreatorItem('n8n').click();
			nodeCreatorFeature.getters.getCategoryItem('Actions').click();
			nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
			NDVModal.actions.close();
			WorkflowPage.getters.canvasNodes().should('have.length', 2);
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.actions.addNodeBetweenNodes('n8n', 'n8n1', 'Item Lists')
			WorkflowPage.getters.canvasNodes().should('have.length', 3);
		})
	});
});
