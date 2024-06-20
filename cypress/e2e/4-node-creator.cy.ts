import { NodeCreator } from '../pages/features/node-creator';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';
import { getVisibleSelect } from '../utils';
import { IF_NODE_NAME } from '../constants';

const nodeCreatorFeature = new NodeCreator();
const WorkflowPage = new WorkflowPageClass();
const NDVModal = new NDV();

describe('Node Creator', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
	});

	it('should open node creator on trigger tab if no trigger is on canvas', () => {
		nodeCreatorFeature.getters.canvasAddButton().click();

		nodeCreatorFeature.getters
			.nodeCreator()
			.contains('What triggers this workflow?')
			.should('be.visible');
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
		nodeCreatorFeature.getters
			.nodeCreator()
			.contains('What triggers this workflow?')
			.should('be.visible');
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
		NDVModal.getters.parameterInput('operation').find('input').should('have.value', 'Crop');
	});

	it('should search through actions and confirm added action', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('ftp');
		nodeCreatorFeature.getters.searchBar().find('input').type('{rightarrow}');
		nodeCreatorFeature.getters.activeSubcategory().should('have.text', 'FTP');
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('file');
		// The 1st trigger is selected, up 1x to the collapsable header, up 2x to the last action (rename)
		nodeCreatorFeature.getters.searchBar().find('input').type('{uparrow}{uparrow}{rightarrow}');
		NDVModal.getters.parameterInput('operation').find('input').should('have.value', 'Rename');
	});

	it('should not show actions for single action nodes', () => {
		const singleActionNodes = [
			'DHL',
			'Edit Fields',
			'LingvaNex',
			'Mailcheck',
			'MSG91',
			'OpenThesaurus',
			'Spontit',
			'Vonage',
			'Send Email',
			'Toggl Trigger',
		];
		const doubleActionNode = 'OpenWeatherMap';

		nodeCreatorFeature.actions.openNodeCreator();
		singleActionNodes.forEach((node) => {
			nodeCreatorFeature.getters.searchBar().find('input').clear().type(node);
			nodeCreatorFeature.getters
				.getCreatorItem(node)
				.find('button[class*="panelIcon"]')
				.should('not.exist');
		});
		nodeCreatorFeature.getters.searchBar().find('input').clear().type(doubleActionNode);
		nodeCreatorFeature.getters.getCreatorItem(doubleActionNode).click();
		nodeCreatorFeature.getters.creatorItem().should('have.length', 4);
	});

	it('should have "Actions" section collapsed when opening actions view from Trigger root view', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('ActiveCampaign');
		nodeCreatorFeature.getters.getCreatorItem('ActiveCampaign').click();
		nodeCreatorFeature.getters.getCategoryItem('Actions').should('exist');
		nodeCreatorFeature.getters.getCategoryItem('Triggers').should('exist');

		nodeCreatorFeature.getters
			.getCategoryItem('Triggers')
			.parent()
			.should('have.attr', 'data-category-collapsed', 'false');
		nodeCreatorFeature.getters
			.getCategoryItem('Actions')
			.parent()
			.should('have.attr', 'data-category-collapsed', 'true');
		nodeCreatorFeature.getters.getCategoryItem('Actions').click();
		nodeCreatorFeature.getters
			.getCategoryItem('Actions')
			.parent()
			.should('have.attr', 'data-category-collapsed', 'false');
	});

	it('should have "Triggers" section collapsed when opening actions view from Regular root view', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.getCreatorItem('Trigger manually').click();

		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
		nodeCreatorFeature.getters.getCreatorItem('n8n').click();

		nodeCreatorFeature.getters
			.getCategoryItem('Actions')
			.parent()
			.should('have.attr', 'data-category-collapsed', 'false');
		nodeCreatorFeature.getters.getCategoryItem('Actions').click();
		nodeCreatorFeature.getters
			.getCategoryItem('Actions')
			.parent()
			.should('have.attr', 'data-category-collapsed', 'true');
		nodeCreatorFeature.getters
			.getCategoryItem('Triggers')
			.parent()
			.should('have.attr', 'data-category-collapsed', 'true');
		nodeCreatorFeature.getters.getCategoryItem('Triggers').click();
		nodeCreatorFeature.getters
			.getCategoryItem('Triggers')
			.parent()
			.should('have.attr', 'data-category-collapsed', 'false');
	});

	it('should show callout and two suggested nodes if node has no trigger actions', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters
			.searchBar()
			.find('input')
			.clear()
			.type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();

		cy.getByTestId('actions-panel-no-triggers-callout').should('be.visible');
		nodeCreatorFeature.getters.getCreatorItem('On a Schedule').should('be.visible');
		nodeCreatorFeature.getters.getCreatorItem('On a Webhook call').should('be.visible');
	});

	it('should show intro callout if user has not made a production execution', () => {
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters
			.searchBar()
			.find('input')
			.clear()
			.type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();

		cy.getByTestId('actions-panel-activation-callout').should('be.visible');
		nodeCreatorFeature.getters.activeSubcategory().find('button').click();
		nodeCreatorFeature.getters.searchBar().find('input').clear();

		nodeCreatorFeature.getters.getCreatorItem('On a schedule').click();

		// Setup 1s interval execution
		cy.getByTestId('parameter-input-field').click();
		getVisibleSelect().find('.option-headline').contains('Seconds').click();
		cy.getByTestId('parameter-input-secondsInterval').clear().type('1');

		NDVModal.actions.close();

		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters
			.searchBar()
			.find('input')
			.clear()
			.type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();
		nodeCreatorFeature.getters.getCreatorItem('Get All People').click();
		NDVModal.actions.close();

		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.actions.activateWorkflow();
		WorkflowPage.getters.activatorSwitch().should('have.class', 'is-checked');

		// Wait for schedule 1s execution to mark user as having made a production execution
		cy.wait(1500);
		cy.reload();

		// Action callout should not be visible after user has made a production execution
		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters
			.searchBar()
			.find('input')
			.clear()
			.type('Customer Datastore (n8n training)');
		nodeCreatorFeature.getters.getCreatorItem('Customer Datastore (n8n training)').click();

		cy.getByTestId('actions-panel-activation-callout').should('not.exist');
	});

	it('should show Trigger and Actions sections during search', () => {
		nodeCreatorFeature.actions.openNodeCreator();

		nodeCreatorFeature.getters
			.searchBar()
			.find('input')
			.clear()
			.type('Customer Datastore (n8n training)');
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
			},
			{
				name: 'plus button',
				handler: () => nodeCreatorFeature.getters.plusButton().click(),
			},
			// We can't test this one because it's not possible to trigger tab key in Cypress
			// only way is to use `realPress` which is hanging the tests in Electron for some reason
			// {
			// 	name: 'tab key',
			// 	handler: () => cy.realPress('Tab'),
			// },
		];
		sourcesWithAppend.forEach((source) => {
			it(`should append manual trigger when source is ${source.name}`, () => {
				source.handler();
				nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
				nodeCreatorFeature.getters.getCreatorItem('n8n').click();
				nodeCreatorFeature.getters.getCategoryItem('Actions').click();
				nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
				NDVModal.actions.close();
				WorkflowPage.getters.canvasNodes().should('have.length', 2);
			});
		});

		// @TODO FIX ADDING 2 NODES IN ONE GO
		it('should not append manual trigger when source is canvas related', () => {
			nodeCreatorFeature.getters.canvasAddButton().click();
			nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
			nodeCreatorFeature.getters.getCreatorItem('n8n').click();
			nodeCreatorFeature.getters.getCategoryItem('Actions').click();
			nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
			NDVModal.actions.close();
			WorkflowPage.actions.deleteNode('When clicking ‘Test workflow’');
			WorkflowPage.getters.canvasNodePlusEndpointByName('n8n').click();
			nodeCreatorFeature.getters.searchBar().find('input').clear().type('n8n');
			nodeCreatorFeature.getters.getCreatorItem('n8n').click();
			nodeCreatorFeature.getters.getCategoryItem('Actions').click();
			nodeCreatorFeature.getters.getCreatorItem('Create a credential').click();
			NDVModal.actions.close();
			WorkflowPage.getters.canvasNodes().should('have.length', 2);
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.actions.addNodeBetweenNodes('n8n', 'n8n1', 'Summarize');
			WorkflowPage.getters.canvasNodes().should('have.length', 3);
		});
	});

	it('should correctly append a No Op node when Loop Over Items node is added (from add button)', () => {
		nodeCreatorFeature.actions.openNodeCreator();

		nodeCreatorFeature.getters.searchBar().find('input').type('Loop Over Items');
		nodeCreatorFeature.getters.getCreatorItem('Loop Over Items').click();
		NDVModal.actions.close();

		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 3);

		WorkflowPage.getters.getConnectionBetweenNodes('Loop Over Items', 'Replace Me').should('exist');
		WorkflowPage.getters.getConnectionBetweenNodes('Replace Me', 'Loop Over Items').should('exist');
	});

	it('should correctly append a No Op node when Loop Over Items node is added (from connection)', () => {
		WorkflowPage.actions.addNodeToCanvas('Manual');
		cy.get('.plus-endpoint').should('be.visible').click();

		nodeCreatorFeature.getters.searchBar().find('input').type('Loop Over Items');
		nodeCreatorFeature.getters.getCreatorItem('Loop Over Items').click();
		NDVModal.actions.close();

		WorkflowPage.getters.canvasNodes().should('have.length', 3);
		WorkflowPage.getters.nodeConnections().should('have.length', 3);

		WorkflowPage.getters.getConnectionBetweenNodes('Loop Over Items', 'Replace Me').should('exist');
		WorkflowPage.getters.getConnectionBetweenNodes('Replace Me', 'Loop Over Items').should('exist');
	});

	it('should have most relevenat nodes on top when searching', () => {
		nodeCreatorFeature.getters.canvasAddButton().click();

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('email');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Email Trigger (IMAP)');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Set');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Edit Fields (Set)');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('i');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', IF_NODE_NAME);
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Switch');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('sw');
		nodeCreatorFeature.getters.searchBar().find('input').clear().type('Edit F');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Edit Fields (Set)');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('i');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', IF_NODE_NAME);
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Switch');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('IF');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', IF_NODE_NAME);
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Switch');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('sw');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Switch');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('swit');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Switch');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('red');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Redis');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Reddit');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('redd');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Reddit');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('wh');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Webhook');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('web');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Webflow');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Webhook');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('webh');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Webhook');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('func');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Code');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('cod');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Coda');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Code');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('code');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Code');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('js');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Code');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Edit Fields (Set)');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('fi');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Filter');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('filt');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Filter');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('manu');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Manual Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('sse');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'SSE Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('cmpar');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Compare Datasets');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('fb');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Facebook Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('crn');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Schedule Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('cron');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Schedule Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('sch');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Schedule Trigger');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('time');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Schedule Trigger');
		nodeCreatorFeature.getters.nodeItemName().eq(2).should('have.text', 'Wait');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('mail');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Mailgun');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('mailc');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Mailcheck');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Mailchimp');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('api');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'HTTP Request');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('s3');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'S3');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('no op');
		nodeCreatorFeature.getters
			.nodeItemName()
			.first()
			.should('have.text', 'No Operation, do nothing');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('do no');
		nodeCreatorFeature.getters
			.nodeItemName()
			.first()
			.should('have.text', 'No Operation, do nothing');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('htt');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'HTTP Request');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Webhook');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('http');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'HTTP Request');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Webhook');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('wa');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Wait');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('wait');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Wait');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('spreadsheet');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Convert to File');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'Extract from File');
		nodeCreatorFeature.getters.nodeItemName().eq(2).should('have.text', 'Google Sheets');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('sheets');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Google Sheets');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('ggle she');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Google Sheets');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('hub');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'HubSpot');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('git');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'Git');
		nodeCreatorFeature.getters.nodeItemName().eq(1).should('have.text', 'GitHub');

		nodeCreatorFeature.getters.searchBar().find('input').clear().type('gith');
		nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'GitHub');
	});
});
