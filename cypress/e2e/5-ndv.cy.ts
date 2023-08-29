import { WorkflowPage, NDV } from '../pages';
import { v4 as uuid } from 'uuid';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('NDV', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
		workflowPage.actions.renameWorkflow(uuid());
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('should show up when double clicked on a node and close when Back to canvas clicked', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.container().should('be.visible');
		ndv.getters.backToCanvas().click();
		ndv.getters.container().should('not.be.visible');
	});

	it('should test webhook node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Webhook');
		workflowPage.getters.canvasNodes().first().dblclick();

		ndv.actions.execute();
		ndv.getters.copyInput().click();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

		cy.readClipboard().then((url) => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200);
			});
		});

		ndv.getters.outputDisplayMode().should('have.length.at.least', 1).and('be.visible');
	});

	it('should change input', () => {
		cy.createFixtureWorkflow('NDV-test-select-input.json', `NDV test select input ${uuid()}`);
		workflowPage.actions.zoomToFit();
		workflowPage.getters.canvasNodes().last().dblclick();
		ndv.getters.inputSelect().click();
		ndv.getters.inputOption().last().click();
		ndv.getters.inputDataContainer().find('[class*=schema_]').should('exist');
		ndv.getters.inputDataContainer().should('contain', 'start');
	});

	it('should show correct validation state for resource locator params', () => {
		workflowPage.actions.addNodeToCanvas('Typeform', true, true);
		ndv.getters.container().should('be.visible');
		cy.get('.has-issues').should('have.length', 0);
		cy.get('[class*=hasIssues]').should('have.length', 0);
		ndv.getters.backToCanvas().click();
		// Both credentials and resource locator errors should be visible
		workflowPage.actions.openNode('Typeform');
		cy.get('.has-issues').should('have.length', 1);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should show validation errors only after blur or re-opening of NDV', () => {
		workflowPage.actions.addNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Airtable', true, true, 'Search records');
		ndv.getters.container().should('be.visible');
		// cy.get('.has-issues').should('have.length', 0);
		ndv.getters.parameterInput('table').find('input').eq(1).focus().blur();
		ndv.getters.parameterInput('base').find('input').eq(1).focus().blur();
		cy.get('.has-issues').should('have.length', 0);
		ndv.getters.backToCanvas().click();
		workflowPage.actions.openNode('Airtable');
		cy.get('.has-issues').should('have.length', 2);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should show all validation errors when opening pasted node', () => {
		cy.fixture('Test_workflow_ndv_errors.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
			workflowPage.getters.canvasNodes().should('have.have.length', 1);
			workflowPage.actions.openNode('Airtable');
			cy.get('.has-issues').should('have.length', 3);
			cy.get('[class*=hasIssues]').should('have.length', 1);
		});
	});

	it('should save workflow using keyboard shortcut from NDV', () => {
		workflowPage.actions.addNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Set', true, true);
		ndv.getters.container().should('be.visible');
		workflowPage.actions.saveWorkflowUsingKeyboardShortcut();
		workflowPage.getters.isWorkflowSaved();
	});

	describe('test output schema view', () => {
		const schemaKeys = [
			'id',
			'name',
			'email',
			'notes',
			'country',
			'created',
			'objectValue',
			'prop1',
			'prop2',
		];
		function setupSchemaWorkflow() {
			cy.createFixtureWorkflow('Test_workflow_schema_test.json', `NDV test schema view ${uuid()}`);
			workflowPage.actions.zoomToFit();
			workflowPage.actions.openNode('Set');
			ndv.actions.execute();
		}

		it('should switch to output schema view and validate it', () => {
			setupSchemaWorkflow();
			ndv.getters.outputDisplayMode().children().should('have.length', 3);
			ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Table');
			ndv.actions.switchOutputMode('Schema');
			ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Schema');

			schemaKeys.forEach((key) => {
				ndv.getters
					.outputPanel()
					.find('[data-test-id=run-data-schema-item]')
					.contains(key)
					.should('exist');
			});
		});
		it('should preserve schema view after execution', () => {
			setupSchemaWorkflow();
			ndv.actions.switchOutputMode('Schema');
			ndv.actions.execute();
			ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Schema');
		});
		it('should collapse and expand nested schema object', () => {
			setupSchemaWorkflow();
			const expandedObjectProps = ['prop1', 'prop2'];
			const getObjectValueItem = () =>
				ndv.getters
					.outputPanel()
					.find('[data-test-id=run-data-schema-item]')
					.filter(':contains("objectValue")');
			ndv.actions.switchOutputMode('Schema');

			expandedObjectProps.forEach((key) => {
				ndv.getters
					.outputPanel()
					.find('[data-test-id=run-data-schema-item]')
					.contains(key)
					.should('be.visible');
			});
			getObjectValueItem().find('label').click();
			expandedObjectProps.forEach((key) => {
				ndv.getters
					.outputPanel()
					.find('[data-test-id=run-data-schema-item]')
					.contains(key)
					.should('not.be.visible');
			});
		});
		it('should not display pagination for schema', () => {
			setupSchemaWorkflow();
			ndv.getters.backToCanvas().click();
			workflowPage.getters.canvasNodeByName('Set').click();
			workflowPage.actions.addNodeToCanvas(
				'Customer Datastore (n8n training)',
				true,
				true,
				'Get All People',
			);
			ndv.actions.execute();
			ndv.getters.outputPanel().contains('25 items').should('exist');
			ndv.getters.outputPanel().find('[class*=_pagination]').should('exist');
			ndv.actions.switchOutputMode('Schema');
			ndv.getters.outputPanel().find('[class*=_pagination]').should('not.exist');
			ndv.actions.switchOutputMode('JSON');
			ndv.getters.outputPanel().find('[class*=_pagination]').should('exist');
		});
		it('should display large schema', () => {
			cy.createFixtureWorkflow(
				'Test_workflow_schema_test_pinned_data.json',
				`NDV test schema view ${uuid()}`,
			);
			workflowPage.actions.zoomToFit();
			workflowPage.actions.openNode('Set');

			ndv.getters.outputPanel().contains('20 items').should('exist');
			ndv.getters.outputPanel().find('[class*=_pagination]').should('exist');
			ndv.actions.switchOutputMode('Schema');
			ndv.getters.outputPanel().find('[class*=_pagination]').should('not.exist');
			ndv.getters
				.outputPanel()
				.find('[data-test-id=run-data-schema-item] [data-test-id=run-data-schema-item]')
				.should('have.length', 20);
		});
	});

	it('can link and unlink run selectors between input and output', () => {
		cy.createFixtureWorkflow('Test_workflow_5.json', 'Test');
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set3');

		ndv.getters
			.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');
		ndv.getters
			.outputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.inputRunSelector().find('input').should('include.value', '1 of 2 (6 items)');
		ndv.getters.inputTbodyCell(1, 0).should('have.text', '1111');
		ndv.getters.outputTbodyCell(1, 0).should('have.text', '1111');

		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.actions.changeInputRunSelector('2 of 2 (6 items)');
		ndv.getters.outputRunSelector().find('input').should('include.value', '2 of 2 (6 items)');

		// unlink
		ndv.actions.toggleOutputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters
			.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		// link again
		ndv.actions.toggleOutputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.getters.inputRunSelector().find('input').should('include.value', '1 of 2 (6 items)');

		// unlink again
		ndv.actions.toggleInputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.actions.changeInputRunSelector('2 of 2 (6 items)');
		ndv.getters.outputRunSelector().find('input').should('include.value', '1 of 2 (6 items)');

		// link again
		ndv.actions.toggleInputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.getters.outputRunSelector().find('input').should('include.value', '2 of 2 (6 items)');
	});

	it('should display parameter hints correctly', () => {
		workflowPage.actions.visit();

		cy.createFixtureWorkflow('Test_workflow_3.json', `My test workflow`);
		workflowPage.actions.openNode('Set1');

		ndv.actions.typeIntoParameterInput('value', '='); // switch to expressions

		[
			{
				input: 'hello',
			},
			{
				input: '',
				output: '[empty]',
			},
			{
				input: ' test',
			},
			{
				input: ' ',
			},
			{
				input: '<div></div>',
			},
		].forEach(({ input, output }) => {
			if (input) {
				ndv.actions.typeIntoParameterInput('value', input);
			}
			ndv.getters.parameterInput('name').click(); // remove focus from input, hide expression preview

			ndv.actions.validateExpressionPreview('value', output || input);
			ndv.getters.parameterInput('value').clear();
		});
	});

	it('should flag issues as soon as params are set', () => {
		workflowPage.actions.addInitialNodeToCanvas('Webhook');
		workflowPage.getters.canvasNodes().first().dblclick();

		workflowPage.getters.nodeIssuesByName('Webhook').should('not.exist');
		ndv.getters.nodeExecuteButton().should('not.be.disabled');
		ndv.getters.triggerPanelExecuteButton().should('exist');

		ndv.getters.parameterInput('path').clear();

		ndv.getters.nodeExecuteButton().should('be.disabled');
		ndv.getters.triggerPanelExecuteButton().should('not.exist');
		ndv.actions.close();
		workflowPage.getters.nodeIssuesByName('Webhook').should('exist');

		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.parameterInput('path').type('t')

		ndv.getters.nodeExecuteButton().should('not.be.disabled');
		ndv.getters.triggerPanelExecuteButton().should('exist');

		ndv.actions.close();
		workflowPage.getters.nodeIssuesByName('Webhook').should('not.exist');
	});
});
