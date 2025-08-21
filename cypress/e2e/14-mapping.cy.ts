import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from './../constants';
import { WorkflowPage, NDV } from '../pages';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Data mapping', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('maps expressions from table header', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');
		ndv.actions.executePrevious();
		ndv.actions.switchInputMode('Table');
		ndv.getters.inputDataContainer().get('table', { timeout: 10000 }).should('exist');

		ndv.getters.nodeParameters().find('input[placeholder*="Add Value"]').click();
		getVisibleSelect().find('li:nth-child(3)').should('have.text', 'String').click();
		ndv.getters
			.parameterInput('name')
			.should('have.length', 1)
			.find('input')
			.should('have.value', 'propertyName');
		ndv.getters
			.parameterInput('value')
			.should('have.length', 1)
			.find('input')
			.should('have.value', '');

		ndv.actions.mapDataFromHeader(1, 'value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.timestamp }}');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', new Date().getFullYear());

		ndv.actions.mapDataFromHeader(2, 'value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', "{{ $json['Readable date'] }}{{ $json.timestamp }}");
	});

	it('maps expressions from table json, and resolves value based on hover', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');
		ndv.actions.switchInputMode('Table');
		ndv.getters.inputDataContainer().get('table', { timeout: 10000 }).should('exist');

		ndv.getters
			.parameterInput('name')
			.should('have.length', 1)
			.find('input')
			.should('have.value', 'other');
		ndv.getters
			.parameterInput('value')
			.should('have.length', 1)
			.find('input')
			.should('have.value', '');

		ndv.getters
			.inputTbodyCell(1, 0)
			.find('span')
			.contains('count')
			.trigger('mousedown', { force: true, button: 0, buttons: 1 });
		ndv.actions.mapToParameter('value');

		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '0');

		ndv.getters.inputTbodyCell(1, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '0')
			.invoke('css', 'color')
			.should('equal', 'rgb(113, 116, 122)');

		ndv.getters.inputTbodyCell(2, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '1')
			.invoke('css', 'color')
			.should('equal', 'rgb(113, 116, 122)');

		ndv.actions.execute();

		ndv.getters.outputTbodyCell(1, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '0')
			.invoke('css', 'color')
			.should('equal', 'rgb(113, 116, 122)'); // todo update color

		ndv.getters.outputTbodyCell(2, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '1')
			.invoke('css', 'color')
			.should('equal', 'rgb(113, 116, 122)');
	});

	it('maps expressions from json view', () => {
		// ADO-3063 - followup to make this viewport global
		cy.viewport('macbook-16');
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');
		ndv.actions.switchInputMode('JSON');

		ndv.getters.inputDataContainer().should('exist');

		ndv.getters
			.inputDataContainer()
			.find('.json-data')
			.should(
				'have.text',
				'[{"input": [{"count": 0,"with space": "!!","with.dot": "!!","with"quotes": "!!"}]},{"input": [{"count": 1}]}]',
			);

		ndv.getters.inputDataContainer().find('span').contains('"count"').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '0');

		ndv.getters
			.inputDataContainer()
			.find('.json-data')
			.find('span')
			.contains('"input"')
			.realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', '{{ $json.input }}{{ $json.input[0].count }}');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');
		ndv.actions.validateExpressionPreview('value', '[object Object]0');
	});

	it('maps expressions from schema view', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');
		ndv.actions.clearParameterInput('value');
		cy.get('body').type('{esc}');

		ndv.getters.inputDataContainer().should('exist').find('span').contains('count').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');
		ndv.actions.validateExpressionPreview('value', '0');

		ndv.getters.inputDataContainer().find('span').contains('input').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', '{{ $json.input }}{{ $json.input[0].count }}');
		ndv.actions.validateExpressionPreview('value', '[object Object]0');
	});

	it('maps expressions from previous nodes', () => {
		cy.createFixtureWorkflow('Test_workflow_3.json', 'My test workflow');
		workflowPage.actions.zoomToFit();
		workflowPage.actions.openNode('Set1');

		ndv.actions.executePrevious();

		ndv.getters.schemaViewNode().contains('Schedule').click();
		const dataPill = ndv.getters
			.inputDataContainer()
			.findChildByTestId('run-data-schema-item')
			.contains('count')
			.should('be.visible');
		dataPill.realMouseDown();
		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', `{{ $('${SCHEDULE_TRIGGER_NODE_NAME}').item.json.input[0].count }}`);
		ndv.getters.inlineExpressionEditorInput().type('{esc}');

		ndv.actions.switchInputMode('Table');
		ndv.actions.selectInputNode(SCHEDULE_TRIGGER_NODE_NAME);
		ndv.actions.mapDataFromHeader(1, 'value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should(
				'have.text',
				`{{ $('${SCHEDULE_TRIGGER_NODE_NAME}').item.json.input }}{{ $('${SCHEDULE_TRIGGER_NODE_NAME}').item.json.input[0].count }}`,
			);

		ndv.actions.selectInputNode('Set');

		ndv.getters.executingLoader().should('not.exist');
		ndv.getters.inputDataContainer().should('exist');
		ndv.actions.validateExpressionPreview('value', '[object Object]0');

		ndv.getters.inputTbodyCell(2, 0).realHover();
		ndv.actions.validateExpressionPreview('value', '[object Object]1');
	});

	it('maps keys to path', () => {
		workflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		workflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		workflowPage.actions.openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		ndv.actions.pastePinnedData([
			{
				input: [
					{
						'hello.world': {
							'my count': 0,
						},
					},
				],
			},
			{
				input: [
					{
						'hello.world': {
							'my count': 1,
						},
					},
				],
			},
		]);

		ndv.actions.close();

		workflowPage.actions.addNodeToCanvas('Sort');
		workflowPage.actions.openNode('Sort');

		ndv.getters.nodeParameters().find('button').contains('Add Field To Sort By').click();

		ndv.getters.inputDataContainer().find('span').contains('my count').realMouseDown();

		ndv.actions.mapToParameter('fieldName');

		ndv.getters.inlineExpressionEditorInput().should('have.length', 0);
		ndv.getters
			.parameterInput('fieldName')
			.find('input')
			.should('have.value', "input[0]['hello.world']['my count']");
	});

	it('maps expressions to updated fields correctly', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');

		ndv.actions.typeIntoParameterInput('value', 'delete me');

		ndv.actions.typeIntoParameterInput('name', 'test');
		ndv.getters.parameterInput('name').find('input').blur();

		ndv.actions.typeIntoParameterInput('value', 'fun');
		ndv.actions.clearParameterInput('value'); // keep focus on param

		ndv.getters.inputDataContainer().should('exist').find('span').contains('count').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');
		ndv.actions.validateExpressionPreview('value', '0');

		ndv.getters.inputDataContainer().find('span').contains('input').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', '{{ $json.input }}{{ $json.input[0].count }}');
		ndv.actions.validateExpressionPreview('value', '[object Object]0');
	});

	it('renders expression preview when a previous node is selected', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');
		ndv.actions.typeIntoParameterInput('value', 'test_value');
		ndv.actions.typeIntoParameterInput('name', '{selectall}test_name');
		ndv.actions.close();

		workflowPage.actions.openNode('Set1');
		ndv.actions.executePrevious();
		ndv.getters.executingLoader().should('not.exist');
		ndv.getters.inputDataContainer().should('exist');
		ndv.actions.switchInputMode('Table');
		ndv.actions.mapDataFromHeader(1, 'value');
		ndv.actions.validateExpressionPreview('value', 'test_value');
		ndv.actions.selectInputNode(SCHEDULE_TRIGGER_NODE_NAME);
		ndv.actions.validateExpressionPreview('value', 'test_value');
	});

	it('shows you can drop to inputs, including booleans', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');
		ndv.getters.parameterInput('includeOtherFields').find('input[type="checkbox"]').should('exist');
		ndv.getters.parameterInput('includeOtherFields').find('input[type="text"]').should('not.exist');
		const pill = ndv.getters.inputDataContainer().find('span').contains('count');
		pill.should('be.visible');
		pill.realMouseDown();
		pill.realMouseMove(100, 100);

		ndv.getters
			.parameterInput('includeOtherFields')
			.find('input[type="checkbox"]')
			.should('not.exist');
		ndv.getters
			.parameterInput('includeOtherFields')
			.find('input[type="text"]')
			.should('exist')
			.invoke('css', 'border')
			.should('include', 'dashed rgb(90, 76, 194)');

		ndv.getters
			.parameterInput('value')
			.find('input[type="text"]')
			.should('exist')
			.invoke('css', 'border')
			.should('include', 'dashed rgb(90, 76, 194)');
	});

	it('maps expressions to a specific location in the editor', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.openNode('Set');
		ndv.actions.typeIntoParameterInput('value', '=');
		ndv.getters.inlineExpressionEditorInput().find('.cm-content').paste('hello world\n\nnewline');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');

		ndv.getters.inputDataContainer().should('exist').find('span').contains('count').realMouseDown();
		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', '{{ $json.input[0].count }}hello worldnewline');
		ndv.getters.inlineExpressionEditorInput().type('{esc}');
		ndv.actions.validateExpressionPreview('value', '0hello world\n\nnewline');

		ndv.getters.inputDataContainer().find('span').contains('input').realMouseDown();
		ndv.actions.mapToParameter('value', 'center');

		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', '{{ $json.input[0].count }}hello world{{ $json.input }}newline');
	});
});
