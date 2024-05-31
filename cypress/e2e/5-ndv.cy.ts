import { v4 as uuid } from 'uuid';
import { getVisibleSelect } from '../utils';
import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../constants';
import { NDV, WorkflowPage } from '../pages';
import { NodeCreator } from '../pages/features/node-creator';
import { clickCreateNewCredential } from '../composables/ndv';
import { setCredentialValues } from '../composables/modals/credential-modal';

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

	it('should show input panel when node is not connected', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.deselectAll();
		workflowPage.actions.addNodeToCanvas('Set');
		workflowPage.getters.canvasNodes().last().dblclick();
		ndv.getters.container().should('be.visible').should('contain', 'Wire me up');
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

	it('should change input and go back to canvas', () => {
		cy.createFixtureWorkflow('NDV-test-select-input.json', `NDV test select input ${uuid()}`);
		workflowPage.actions.zoomToFit();
		workflowPage.getters.canvasNodes().last().dblclick();
		ndv.getters.inputSelect().click();
		ndv.getters.inputOption().last().click();
		ndv.getters.inputDataContainer().find('[class*=schema_]').should('exist');
		ndv.getters.inputDataContainer().should('contain', 'start');
		ndv.getters.backToCanvas().click();
		ndv.getters.container().should('not.be.visible');
		cy.shouldNotHaveConsoleErrors();
	});

	it('should disconect Switch outputs if rules order was changed', () => {
		cy.createFixtureWorkflow('NDV-test-switch_reorder.json', `NDV test switch reorder`);
		workflowPage.actions.zoomToFit();

		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Merge');
		ndv.getters.outputPanel().contains('2 items').should('exist');
		cy.contains('span', 'first').should('exist');
		ndv.getters.backToCanvas().click();

		workflowPage.actions.openNode('Switch');
		cy.get('.cm-line').realMouseMove(100, 100);
		cy.get('.fa-angle-down').click();
		ndv.getters.backToCanvas().click();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Merge');
		ndv.getters.outputPanel().contains('1 item').should('exist');
		cy.contains('span', 'zero').should('exist');
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
		cy.get('.has-issues').should('have.length', 0);
		ndv.getters.parameterInput('table').find('input').eq(1).focus().blur();
		ndv.getters.parameterInput('base').find('input').eq(1).focus().blur();
		cy.get('.has-issues').should('have.length', 2);
		ndv.getters.backToCanvas().click();
		workflowPage.actions.openNode('Airtable');
		cy.get('.has-issues').should('have.length', 2);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should show all validation errors when opening pasted node', () => {
		cy.createFixtureWorkflow('Test_workflow_ndv_errors.json', 'Validation errors');
		workflowPage.getters.canvasNodes().should('have.have.length', 1);
		workflowPage.actions.openNode('Airtable');
		cy.get('.has-issues').should('have.length', 3);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should render run errors correctly', () => {
		cy.createFixtureWorkflow('Test_workflow_ndv_run_error.json', 'Run error');
		workflowPage.actions.openNode('Error');
		ndv.actions.execute();
		ndv.getters
			.nodeRunErrorMessage()
			.should('have.text', 'Info for expression missing from previous node');
		ndv.getters
			.nodeRunErrorDescription()
			.should(
				'contains.text',
				"An expression here won't work because it uses .item and n8n can't figure out the matching item.",
			);
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

	it('should not retrieve remote options when required params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', { action: 'Remote Options' });

		ndv.getters.parameterInput('remoteOptions').click();
		getVisibleSelect().find('.el-select-dropdown__item').should('have.length', 3);

		ndv.actions.setInvalidExpression({ fieldName: 'fieldId', delay: 200 });

		ndv.getters.inputPanel().click(); // remove focus from input, hide expression preview

		ndv.getters.parameterInput('remoteOptions').click();

		ndv.getters.parameterInputIssues('remoteOptions').realHover({ scrollBehavior: false });
		// Remote options dropdown should not be visible
		ndv.getters.parameterInput('remoteOptions').find('.el-select').should('not.exist');
	});

	it('should retrieve remote options when non-required params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', { action: 'Remote Options' });

		ndv.getters.parameterInput('remoteOptions').click();
		getVisibleSelect().find('.el-select-dropdown__item').should('have.length', 3);
		ndv.getters.parameterInput('remoteOptions').click();

		ndv.actions.setInvalidExpression({ fieldName: 'otherField', delay: 50 });

		ndv.getters.nodeParameters().click(); // remove focus from input, hide expression preview

		ndv.getters.parameterInput('remoteOptions').click();
		getVisibleSelect().find('.el-select-dropdown__item').should('have.length', 3);
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
		ndv.getters.parameterInput('path').type('t');

		ndv.getters.nodeExecuteButton().should('not.be.disabled');
		ndv.getters.triggerPanelExecuteButton().should('exist');

		ndv.actions.close();
		workflowPage.getters.nodeIssuesByName('Webhook').should('not.exist');
	});

	it('should not push NDV header out with a lot of code in Code node editor', () => {
		workflowPage.actions.addInitialNodeToCanvas('Code', { keepNdvOpen: true });
		ndv.getters.parameterInput('jsCode').get('.cm-content').type('{selectall}').type('{backspace}');
		cy.fixture('Dummy_javascript.txt').then((code) => {
			ndv.getters.parameterInput('jsCode').get('.cm-content').paste(code);
		});
		ndv.getters.nodeExecuteButton().should('be.visible');
	});

	it('should allow editing code in fullscreen in the Code node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Code', { keepNdvOpen: true });
		ndv.actions.openCodeEditorFullscreen();

		ndv.getters.codeEditorFullscreen().type('{selectall}').type('{backspace}').type('foo()');
		ndv.getters.codeEditorFullscreen().should('contain.text', 'foo()');
		cy.wait(200);
		ndv.getters.codeEditorDialog().find('.el-dialog__close').click();
		ndv.getters.parameterInput('jsCode').get('.cm-content').should('contain.text', 'foo()');
	});

	it('should not retrieve remote options when a parameter value changes', () => {
		cy.intercept(
			'POST',
			'/rest/dynamic-node-parameters/options',
			cy.spy().as('fetchParameterOptions'),
		);
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', { action: 'Remote Options' });
		// Type something into the field
		ndv.actions.typeIntoParameterInput('otherField', 'test');
		// Should call the endpoint only once (on mount), not for every keystroke
		cy.get('@fetchParameterOptions').should('have.been.calledOnce');
	});

	describe('floating nodes', () => {
		function getFloatingNodeByPosition(
			position: 'inputMain' | 'outputMain' | 'outputSub' | 'inputSub',
		) {
			return cy.get(`[data-node-placement=${position}]`);
		}

		it('should traverse floating nodes with mouse', () => {
			cy.createFixtureWorkflow('Floating_Nodes.json', `Floating Nodes`);
			workflowPage.getters.canvasNodes().first().dblclick();
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('outputMain').should('exist');
			// Traverse 4 connected node forwards
			Array.from(Array(4).keys()).forEach((i) => {
				getFloatingNodeByPosition('outputMain').click({ force: true });
				ndv.getters.nodeNameContainer().should('contain', `Node ${i + 1}`);
				getFloatingNodeByPosition('inputMain').should('exist');
				getFloatingNodeByPosition('outputMain').should('exist');
				ndv.actions.close();
				workflowPage.getters.selectedNodes().should('have.length', 1);
				workflowPage.getters
					.selectedNodes()
					.first()
					.should('contain', `Node ${i + 1}`);
				workflowPage.getters.selectedNodes().first().dblclick();
			});

			getFloatingNodeByPosition('outputMain').click({ force: true });
			ndv.getters.nodeNameContainer().should('contain', 'Chain');

			// Traverse 4 connected node backwards
			Array.from(Array(4).keys()).forEach((i) => {
				getFloatingNodeByPosition('inputMain').click({ force: true });
				ndv.getters.nodeNameContainer().should('contain', `Node ${4 - i}`);
				getFloatingNodeByPosition('outputMain').should('exist');
				getFloatingNodeByPosition('inputMain').should('exist');
			});
			getFloatingNodeByPosition('inputMain').click({ force: true });
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('inputSub').should('not.exist');
			getFloatingNodeByPosition('outputSub').should('not.exist');
			ndv.actions.close();
			workflowPage.getters.selectedNodes().should('have.length', 1);
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		});

		it('should traverse floating nodes with keyboard', () => {
			cy.createFixtureWorkflow('Floating_Nodes.json', `Floating Nodes`);
			workflowPage.getters.canvasNodes().first().dblclick();
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('outputMain').should('exist');
			// Traverse 4 connected node forwards
			Array.from(Array(4).keys()).forEach((i) => {
				cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowRight']);
				ndv.getters.nodeNameContainer().should('contain', `Node ${i + 1}`);
				getFloatingNodeByPosition('inputMain').should('exist');
				getFloatingNodeByPosition('outputMain').should('exist');
				ndv.actions.close();
				workflowPage.getters.selectedNodes().should('have.length', 1);
				workflowPage.getters
					.selectedNodes()
					.first()
					.should('contain', `Node ${i + 1}`);
				workflowPage.getters.selectedNodes().first().dblclick();
			});

			cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowRight']);
			ndv.getters.nodeNameContainer().should('contain', 'Chain');

			// Traverse 4 connected node backwards
			Array.from(Array(4).keys()).forEach((i) => {
				cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowLeft']);
				ndv.getters.nodeNameContainer().should('contain', `Node ${4 - i}`);
				getFloatingNodeByPosition('outputMain').should('exist');
				getFloatingNodeByPosition('inputMain').should('exist');
			});
			cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowLeft']);
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('inputSub').should('not.exist');
			getFloatingNodeByPosition('outputSub').should('not.exist');
			ndv.actions.close();
			workflowPage.getters.selectedNodes().should('have.length', 1);
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		});

		it('should connect floating sub-nodes', () => {
			const nodeCreator = new NodeCreator();
			const connectionGroups = [
				{
					title: 'Language Models',
					id: 'ai_languageModel',
				},
				{
					title: 'Tools',
					id: 'ai_tool',
				},
			];

			workflowPage.actions.addInitialNodeToCanvas('AI Agent', { keepNdvOpen: true });

			connectionGroups.forEach((group) => {
				cy.getByTestId(`add-subnode-${group.id}`).should('exist');
				cy.getByTestId(`add-subnode-${group.id}`).click();

				cy.getByTestId('nodes-list-header').contains(group.title).should('exist');
				nodeCreator.getters.getNthCreatorItem(1).click();
				getFloatingNodeByPosition('outputSub').should('exist');
				getFloatingNodeByPosition('outputSub').click({ force: true });

				if (group.id === 'ai_languageModel') {
					cy.getByTestId(`add-subnode-${group.id}`).should('not.exist');
				} else {
					cy.getByTestId(`add-subnode-${group.id}`).should('exist');
					// Expand the subgroup
					cy.getByTestId('subnode-connection-group-ai_tool').click();
					cy.getByTestId(`add-subnode-${group.id}`).click();
					nodeCreator.getters.getNthCreatorItem(1).click();
					getFloatingNodeByPosition('outputSub').click({ force: true });
					cy.getByTestId('subnode-connection-group-ai_tool')
						.findChildByTestId('floating-subnode')
						.should('have.length', 2);
				}
			});

			// Since language model has no credentials set, it should show an error
			// Sinse code tool require alphanumeric tool name it would also show an error(2 errors, 1 for each tool node)
			cy.get('[class*=hasIssues]').should('have.length', 3);
		});
	});

	it('should show node name and version in settings', () => {
		cy.createFixtureWorkflow('Test_workflow_ndv_version.json', `NDV test version ${uuid()}`);

		workflowPage.actions.openNode('Edit Fields (old)');
		ndv.actions.openSettings();
		ndv.getters.nodeVersion().should('have.text', 'Set node version 2 (Latest version: 3.3)');
		ndv.actions.close();

		workflowPage.actions.openNode('Edit Fields (latest)');
		ndv.actions.openSettings();
		ndv.getters.nodeVersion().should('have.text', 'Edit Fields (Set) node version 3.3 (Latest)');
		ndv.actions.close();

		workflowPage.actions.openNode('Edit Fields (no typeVersion)');
		ndv.actions.openSettings();
		ndv.getters.nodeVersion().should('have.text', 'Edit Fields (Set) node version 3.3 (Latest)');
		ndv.actions.close();

		workflowPage.actions.openNode('Function');
		ndv.actions.openSettings();
		ndv.getters.nodeVersion().should('have.text', 'Function node version 1 (Deprecated)');
		ndv.actions.close();
	});

	it('Should render xml and html tags as strings and can search', () => {
		cy.createFixtureWorkflow('Test_workflow_xml_output.json', `test`);

		workflowPage.actions.executeWorkflow();

		workflowPage.actions.openNode('Edit Fields');

		ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Table');

		ndv.getters
			.outputTableRow(1)
			.should('include.text', '<?xml version="1.0" encoding="UTF-8"?> <library>');

		cy.document().trigger('keyup', { key: '/' });
		ndv.getters.searchInput().filter(':focus').type('<lib');

		ndv.getters.outputTableRow(1).find('mark').should('have.text', '<lib');

		ndv.getters.outputDisplayMode().find('label').eq(1).should('include.text', 'JSON');
		ndv.getters.outputDisplayMode().find('label').eq(1).click();

		ndv.getters.outputDataContainer().find('.json-data').should('exist');
		ndv.getters
			.outputDataContainer()
			.should(
				'have.text',
				'[{"body": "<?xml version="1.0" encoding="UTF-8"?> <library>     <book>         <title>Introduction to XML</title>         <author>John Doe</author>         <publication_year>2020</publication_year>         <isbn>1234567890</isbn>     </book>     <book>         <title>Data Science Basics</title>         <author>Jane Smith</author>         <publication_year>2019</publication_year>         <isbn>0987654321</isbn>     </book>     <book>         <title>Programming in Python</title>         <author>Bob Johnson</author>         <publication_year>2021</publication_year>         <isbn>5432109876</isbn>     </book> </library>"}]',
			);
		ndv.getters.outputDataContainer().find('mark').should('have.text', '<lib');

		ndv.getters.outputDisplayMode().find('label').eq(2).should('include.text', 'Schema');
		ndv.getters.outputDisplayMode().find('label').eq(2).click({ force: true });
		ndv.getters
			.outputDataContainer()
			.findChildByTestId('run-data-schema-item')
			.find('> span')
			.should('include.text', '<?xml version="1.0" encoding="UTF-8"?>');
	});

	it('should properly show node execution indicator', () => {
		workflowPage.actions.addInitialNodeToCanvas('Code');
		workflowPage.actions.openNode('Code');
		// Should not show run info before execution
		ndv.getters.nodeRunSuccessIndicator().should('not.exist');
		ndv.getters.nodeRunErrorIndicator().should('not.exist');
		ndv.getters.nodeExecuteButton().click();
		ndv.getters.nodeRunSuccessIndicator().should('exist');
	});

	it('should properly show node execution indicator for multiple nodes', () => {
		workflowPage.actions.addInitialNodeToCanvas('Code');
		workflowPage.actions.openNode('Code');
		ndv.actions.typeIntoParameterInput('jsCode', 'testets');
		ndv.getters.backToCanvas().click();
		workflowPage.actions.executeWorkflow();
		// Manual tigger node should show success indicator
		workflowPage.actions.openNode('When clicking ‘Test workflow’');
		ndv.getters.nodeRunSuccessIndicator().should('exist');
		// Code node should show error
		ndv.getters.backToCanvas().click();
		workflowPage.actions.openNode('Code');
		ndv.getters.nodeRunErrorIndicator().should('exist');
	});

	it('Should clear mismatched collection parameters', () => {
		workflowPage.actions.addInitialNodeToCanvas('LDAP', {
			keepNdvOpen: true,
			action: 'Create a new entry',
		});
		// Add some attributes in Create operation
		cy.getByTestId('parameter-item').contains('Add Attributes').click();
		ndv.actions.changeNodeOperation('Update');
		// Attributes should be empty after operation change
		cy.getByTestId('parameter-item').contains('Currently no items exist').should('exist');
	});

	it('Should keep RLC values after operation change', () => {
		const TEST_DOC_ID = '1111';
		workflowPage.actions.addInitialNodeToCanvas('Google Sheets', {
			keepNdvOpen: true,
			action: 'Append row in sheet',
		});
		ndv.actions.setRLCValue('documentId', TEST_DOC_ID);
		ndv.actions.changeNodeOperation('Update Row');
		ndv.getters.resourceLocatorInput('documentId').find('input').should('have.value', TEST_DOC_ID);
	});

	it('Should not clear resource/operation after credential change', () => {
		workflowPage.actions.addInitialNodeToCanvas('Discord', {
			keepNdvOpen: true,
			action: 'Delete a message',
		});

		clickCreateNewCredential();
		setCredentialValues({
			botToken: 'sk_test_123',
		});

		ndv.getters.parameterInput('resource').find('input').should('have.value', 'Message');
		ndv.getters.parameterInput('operation').find('input').should('have.value', 'Delete');
	});

	it('Should open appropriate node creator after clicking on connection hint link', () => {
		const nodeCreator = new NodeCreator();
		const hintMapper = {
			Memory: 'AI Nodes',
			'Output Parser': 'AI Nodes',
			'Token Splitter': 'Document Loaders',
			Tool: 'AI Nodes',
			Embeddings: 'Vector Stores',
			'Vector Store': 'Retrievers',
		};
		cy.createFixtureWorkflow(
			'open_node_creator_for_connection.json',
			`open_node_creator_for_connection ${uuid()}`,
		);

		Object.entries(hintMapper).forEach(([node, group]) => {
			workflowPage.actions.openNode(node);
			cy.get('[data-action=openSelectiveNodeCreator]').contains('Insert one').click();
			nodeCreator.getters.activeSubcategory().should('contain', group);
			cy.realPress('Escape');
		});
	});

	it('Stop listening for trigger event from NDV', () => {
		cy.intercept('POST', '/rest/workflows/**/run').as('workflowRun');
		workflowPage.actions.addInitialNodeToCanvas('Local File Trigger', {
			keepNdvOpen: true,
			action: 'On Changes To A Specific File',
			isTrigger: true,
		});
		ndv.getters.triggerPanelExecuteButton().should('exist');
		ndv.getters.triggerPanelExecuteButton().realClick();
		ndv.getters.triggerPanelExecuteButton().should('contain', 'Stop Listening');
		ndv.getters.triggerPanelExecuteButton().realClick();
		cy.wait('@workflowRun').then(() => {
			ndv.getters.triggerPanelExecuteButton().should('contain', 'Test step');
			workflowPage.getters.successToast().should('exist');
		});
	});

	it('should allow selecting item for expressions', () => {
		workflowPage.actions.visit();

		cy.createFixtureWorkflow('Test_workflow_3.json', `My test workflow`);
		workflowPage.actions.openNode('Set');

		ndv.actions.typeIntoParameterInput('value', '='); // switch to expressions
		ndv.actions.typeIntoParameterInput('value', '{{', {
			parseSpecialCharSequences: false,
		});
		ndv.actions.typeIntoParameterInput('value', '$json.input[0].count');
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '0');

		ndv.actions.expressionSelectNextItem();
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '1');
		ndv.getters.inlineExpressionEditorItemInput().should('have.value', '1');
		ndv.getters.inlineExpressionEditorItemNextButton().should('be.disabled');

		ndv.actions.expressionSelectPrevItem();
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '0');
		ndv.getters.inlineExpressionEditorItemInput().should('have.value', '0');
		ndv.getters.inlineExpressionEditorItemPrevButton().should('be.disabled');

		ndv.actions.expressionSelectItem(1);
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '1');
	});
});
