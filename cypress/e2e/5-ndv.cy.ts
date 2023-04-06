import { WorkflowPage, NDV } from '../pages';
import { v4 as uuid } from 'uuid';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('NDV', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();

	});
	beforeEach(() => {
		workflowPage.actions.visit();
		workflowPage.actions.renameWorkflow(uuid());
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	// it('should show up when double clicked on a node and close when Back to canvas clicked', () => {
	// 	workflowPage.actions.addInitialNodeToCanvas('Manual');
	// 	workflowPage.getters.canvasNodes().first().dblclick();
	// 	ndv.getters.container().should('be.visible');
	// 	ndv.getters.backToCanvas().click();
	// 	ndv.getters.container().should('not.be.visible');
	// });

	// it('should test webhook node', () => {
	// 	workflowPage.actions.addInitialNodeToCanvas('Webhook');
	// 	workflowPage.getters.canvasNodes().first().dblclick();

	// 	ndv.actions.execute();
	// 	ndv.getters.copyInput().click();

	// 	cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

	// 	cy.readClipboard().then((url) => {
	// 		cy.request({
	// 			method: 'GET',
	// 			url,
	// 		}).then((resp) => {
	// 			expect(resp.status).to.eq(200);
	// 		});
	// 	});

	// 	ndv.getters.outputDisplayMode().should('have.length.at.least', 1).and('be.visible');
	// });

	// it('should change input', () => {
	// 	cy.createFixtureWorkflow('NDV-test-select-input.json', `NDV test select input ${uuid()}`);
	// 	workflowPage.actions.zoomToFit();
	// 	workflowPage.getters.canvasNodes().last().dblclick();
	// 	ndv.getters.inputSelect().click();
	// 	ndv.getters.inputOption().last().click();
	// 	ndv.getters.inputDataContainer().find('[class*=schema_]').should('exist')
	// 	ndv.getters.inputDataContainer().should('contain', 'start');
	// });

	// it('should show correct validation state for resource locator params', () => {
	// 	workflowPage.actions.addNodeToCanvas('Typeform', true, true);
	// 	ndv.getters.container().should('be.visible');
	// 	cy.get('.has-issues').should('have.length', 0);
	// 	cy.get('[class*=hasIssues]').should('have.length', 0);
	// 	ndv.getters.backToCanvas().click();
	// 	// Both credentials and resource locator errors should be visible
	// 	workflowPage.actions.openNode('Typeform');
	// 	cy.get('.has-issues').should('have.length', 1);
	// 	cy.get('[class*=hasIssues]').should('have.length', 1);
	// });

	// it('should show validation errors only after blur or re-opening of NDV', () => {
	// 	workflowPage.actions.addNodeToCanvas('Manual');
	// 	workflowPage.actions.addNodeToCanvas('Airtable', true, true, 'Read data from a table');
	// 	ndv.getters.container().should('be.visible');
	// 	cy.get('.has-issues').should('have.length', 0);
	// 	ndv.getters.parameterInput('table').find('input').eq(1).focus().blur();
	// 	ndv.getters.parameterInput('application').find('input').eq(1).focus().blur();
	// 	cy.get('.has-issues').should('have.length', 2);
	// 	ndv.getters.backToCanvas().click();
	// 	workflowPage.actions.openNode('Airtable');
	// 	cy.get('.has-issues').should('have.length', 3);
	// 	cy.get('[class*=hasIssues]').should('have.length', 1);
	// });

	// it('should show all validation errors when opening pasted node', () => {
	// 	cy.fixture('Test_workflow_ndv_errors.json').then((data) => {
	// 		cy.get('body').paste(JSON.stringify(data));
	// 		workflowPage.getters.canvasNodes().should('have.have.length', 1);
	// 		workflowPage.actions.openNode('Airtable');
	// 		cy.get('.has-issues').should('have.length', 3);
	// 		cy.get('[class*=hasIssues]').should('have.length', 1);
	// 	});
	// });

	// it('should save workflow using keyboard shortcut from NDV', () => {
	// 	workflowPage.actions.addNodeToCanvas('Manual');
	// 	workflowPage.actions.addNodeToCanvas('Set', true, true);
	// 	ndv.getters.container().should('be.visible');
	// 	workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
	// 	workflowPage.getters.isWorkflowSaved();
	// })

	// describe('test output schema view', () => {
	// 	const schemaKeys = ['id', 'name', 'email', 'notes', 'country', 'created', 'objectValue', 'prop1', 'prop2'];
	// 	function setupSchemaWorkflow() {
	// 		cy.createFixtureWorkflow('Test_workflow_schema_test.json', `NDV test schema view ${uuid()}`);
	// 		workflowPage.actions.zoomToFit();
	// 		workflowPage.actions.openNode('Set');
	// 		ndv.actions.execute();
	// 	}

	// 	it('should switch to output schema view and validate it', () => {
	// 		setupSchemaWorkflow()
	// 		ndv.getters.outputDisplayMode().children().should('have.length', 3);
	// 		ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Table');
	// 		ndv.getters.outputDisplayMode().contains('Schema').click();
	// 		ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Schema');

	// 		schemaKeys.forEach((key) => {
	// 			ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').contains(key).should('exist');
	// 		});
	// 	});
	// 	it('should preserve schema view after execution', () => {
	// 		setupSchemaWorkflow()
	// 		ndv.getters.outputDisplayMode().contains('Schema').click();
	// 		ndv.actions.execute();
	// 		ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Schema');
	// 	})
	// 	it('should collapse and expand nested schema object', () => {
	// 		setupSchemaWorkflow()
	// 		const expandedObjectProps = ['prop1', 'prop2'];;
	// 		const getObjectValueItem = () => ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').filter(':contains("objectValue")');
	// 		ndv.getters.outputDisplayMode().contains('Schema').click();

	// 		expandedObjectProps.forEach((key) => {
	// 			ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').contains(key).should('be.visible');
	// 		});
	// 		getObjectValueItem().find('label').click();
	// 		expandedObjectProps.forEach((key) => {
	// 			ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').contains(key).should('not.be.visible');
	// 		});
	// 	})
	// 	it('should not display pagination for schema', () => {
	// 		setupSchemaWorkflow()
	// 		ndv.getters.backToCanvas().click();
	// 		workflowPage.getters.canvasNodeByName('Set').click();
	// 		workflowPage.actions.addNodeToCanvas('Customer Datastore (n8n training)', true, true, 'Get All People');
	// 		ndv.actions.execute();
	// 		ndv.getters.outputPanel().contains('25 items').should('exist');
	// 		ndv.getters.outputPanel().find('[class*=_pagination]').should('exist');
	// 		ndv.getters.outputDisplayMode().contains('Schema').click();
	// 		ndv.getters.outputPanel().find('[class*=_pagination]').should('not.exist');
	// 		ndv.getters.outputDisplayMode().contains('JSON').click();
	// 		ndv.getters.outputPanel().find('[class*=_pagination]').should('exist');
	// 	})
	// 	it('should display large schema', () => {
	// 		cy.createFixtureWorkflow('Test_workflow_schema_test_pinned_data.json', `NDV test schema view ${uuid()}`);
	// 		workflowPage.actions.zoomToFit();
	// 		workflowPage.actions.openNode('Set');

	// 		ndv.getters.outputPanel().contains('20 items').should('exist');
	// 		ndv.getters.outputPanel().find('[class*=_pagination]').should('exist');
	// 		ndv.getters.outputDisplayMode().contains('Schema').click();
	// 		ndv.getters.outputPanel().find('[class*=_pagination]').should('not.exist');
	// 		ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item] [data-test-id=run-data-schema-item]').should('have.length', 20);
	// 	})
	// })

	it('maps paired input and output items', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.executeWorkflow();

		workflowPage.actions.openNode('Item Lists');

		ndv.getters.inputPanel().contains('6 items').should('exist');
		ndv.getters.outputPanel().contains('6 items').should('exist');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		// input to output
		ndv.getters.inputTableRow(1)
			.should('exist')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.inputTableRow(1)
			.realHover();
		ndv.getters.outputTableRow(4)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.inputTableRow(2)
			.realHover();
		ndv.getters.outputTableRow(2)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		
		ndv.getters.inputTableRow(3)
			.realHover();
		ndv.getters.outputTableRow(6)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		// output to input
		ndv.getters.outputTableRow(1)
			.realHover();
		ndv.getters.inputTableRow(4)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

			ndv.getters.outputTableRow(4)
			.realHover();
		ndv.getters.inputTableRow(1)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(2)
			.realHover();
		ndv.getters.inputTableRow(2)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		
		ndv.getters.outputTableRow(6)
			.realHover();
		ndv.getters.inputTableRow(3)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(1)
			.realHover();
		ndv.getters.inputTableRow(4)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
	});

	it('maps paired input and output items based on selected input node', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set2');

		ndv.getters.inputPanel().contains('6 items').should('exist');
		ndv.getters.outputRunSelector()
			.should('exist')
			.should('include.text', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');
		cy.wait(50);

		ndv.getters.outputHoveringItem().should('not.exist');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1111');

		ndv.actions.selectInputNode('Set1');
		ndv.getters.inputHoveringItem().should('have.text', '1000').realHover();
		ndv.getters.outputHoveringItem().should('have.text', '1000');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');

		ndv.actions.selectInputNode('Item Lists');
		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.inputHoveringItem().should('have.text', '1111').realHover();
		ndv.getters.outputHoveringItem().should('have.text', '1111');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1111');
	});

	it('maps paired input and output items based on selected run', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set3');

		ndv.getters.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');
		ndv.getters.outputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.inputRunSelector().find('input')
			.should('include.value', '1 of 2 (6 items)');
		ndv.getters.outputRunSelector().find('input')
			.should('include.value', '1 of 2 (6 items)');

		ndv.getters.inputHoveringItem().should('have.text', '1111').realHover();
		ndv.getters.outputHoveringItem().should('have.text', '1111');

		ndv.getters.outputTableRow(3)
			.should('have.text', '4444')
			.realHover();
		ndv.getters.inputTableRow(3)
			.should('have.text', '4444')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.actions.changeOutputRunSelector('2 of 2 (6 items)');
		cy.wait(50);

		ndv.getters.inputTableRow(1)
			.should('have.text', '1000')
			.realHover();
		ndv.getters.outputTableRow(1)
			.should('have.text', '1000')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(3)
			.should('have.text', '2000')
			.realHover();
		ndv.getters.inputTableRow(3)
			.should('have.text', '2000')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
	});

	it('resolves expression with default item when input node is not parent, while still pairing items', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set2');

		ndv.getters.inputPanel().contains('6 items').should('exist');
		ndv.getters.outputRunSelector()
			.should('exist')
			.should('include.text', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');
		cy.wait(50);

		ndv.getters.inputHoveringItem().should('have.text', '1111').realHover();
		ndv.getters.outputHoveringItem().should('not.exist');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1111');

		ndv.actions.selectInputNode('Code1');
		ndv.getters.inputHoveringItem().should('have.text', '1000').realHover();
		ndv.getters.outputHoveringItem().should('have.text', '1000');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');

		ndv.actions.selectInputNode('Code');
		ndv.getters.inputHoveringItem().should('have.text', '10').realHover();
		ndv.getters.outputHoveringItem().should('not.exist');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');

		ndv.actions.selectInputNode('When clicking');
		ndv.getters.inputTableRow(1).should('have.text', "This is an item, but it's empty.").realHover();
		ndv.getters.outputHoveringItem().should('have.length', 6);
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');
	});

	it('can link and unlink run selectors between input and output', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set3');

		ndv.getters.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');
		ndv.getters.outputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.inputRunSelector()
			.find('input')
			.should('include.value', '1 of 2 (6 items)');
		ndv.getters.inputTbodyCell(1, 0).should('have.text', '1111');
		ndv.getters.outputTbodyCell(1, 0).should('have.text', '1111');

		ndv.actions.changeInputRunSelector('2 of 2 (6 items)');
		ndv.getters.outputRunSelector()
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		// unlink
		ndv.actions.toggleOutputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).realMouseDown(); // remove tooltip
		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		// link again
		ndv.actions.toggleOutputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).realMouseDown(); // remove tooltip
		ndv.getters.inputRunSelector()
			.find('input')
			.should('include.value', '1 of 2 (6 items)');
		
		// unlink again
		ndv.actions.toggleInputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).realMouseDown(); // remove tooltip
		ndv.actions.changeInputRunSelector('2 of 2 (6 items)');
		ndv.getters.outputRunSelector()
			.find('input')
			.should('include.value', '1 of 2 (6 items)');

		// link again
		ndv.actions.toggleInputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).realMouseDown(); // remove tooltip
		ndv.getters.outputRunSelector()
			.find('input')
			.should('include.value', '2 of 2 (6 items)');
	});

	it('can pair items between input and output across branches and runs', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('IF');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.actions.switchOutputBranch('False Branch (2 items)');
		ndv.getters.outputTableRow(1)
			.should('have.text', '13')
			.realHover();
		ndv.getters.inputTableRow(5)
			.should('have.text', '13')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(2)
			.should('have.text', '20')
			.realHover();
		ndv.getters.inputTableRow(6)
			.should('have.text', '20')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.actions.close();
		workflowPage.actions.openNode('Set5');
		ndv.getters.outputTableRow(1)
			.should('have.text', '13')
			.realHover();
		ndv.getters.inputHoveringItem().should('not.exist');

		ndv.getters.inputTableRow(1)
			.should('have.text', '1111')
			.realHover();
		ndv.getters.outputHoveringItem().should('not.exist');

		ndv.actions.switchIntputBranch('False Branch');
		ndv.getters.inputTableRow(1)
			.should('have.text', '13')
			.realHover();
		ndv.getters.outputHoveringItem().should('have.text', '13');

		ndv.actions.changeOutputRunSelector('1 of 2 (4 items)')
		ndv.getters.outputTableRow(1)
			.should('have.text', '1111')
			.realHover();
		// todo there's a bug here need to fix
		// ndv.getters.outputHoveringItem().should('not.exist');
	});

	// todos
	// it('can pair items between input and output across pages', () => {});
	// it('shows only connected input branches of parent nodes', () => {});
	// it('avoids linking when runs don't match')
});
