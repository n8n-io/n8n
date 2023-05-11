import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from './../constants';
import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Data mapping', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		workflowPage.actions.visit();

		cy.window().then(
			(win) => {
				// @ts-ignore
				win.preventNodeViewBeforeUnload = true;
			},
		);
	});

	it('maps expressions from table header', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.openNode('Set');
		ndv.actions.executePrevious();
		ndv.actions.switchInputMode('Table');
		ndv.getters.inputDataContainer().get('table', { timeout: 10000 }).should('exist');

		ndv.getters.nodeParameters().find('input[placeholder*="Add Value"]').click();
		ndv.getters
			.nodeParameters()
			.find('.el-select-dropdown__list li:nth-child(3)')
			.should('have.text', 'String')
			.click();
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

		ndv.actions.mapDataFromHeader(2, 'value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', "{{ $json.timestamp }} {{ $json['Readable date'] }}");
	});

	it('maps expressions from table json, and resolves value based on hover', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});

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
			.trigger('mousedown', { force: true });
		ndv.actions.mapToParameter('value');

		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '0');

		ndv.getters.inputTbodyCell(1, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '0')
			.invoke('css', 'color')
			.should('equal', 'rgb(125, 125, 135)');

		ndv.getters.inputTbodyCell(2, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '1')
			.invoke('css', 'color')
			.should('equal', 'rgb(125, 125, 135)');

		ndv.actions.execute();

		ndv.getters.outputTbodyCell(1, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '0')
			.invoke('css', 'color')
			.should('equal', 'rgb(125, 125, 135)'); // todo update color

		ndv.getters.outputTbodyCell(2, 0).realHover();
		ndv.getters
			.parameterExpressionPreview('value')
			.should('include.text', '1')
			.invoke('css', 'color')
			.should('equal', 'rgb(125, 125, 135)');
	});

	it('maps expressions from json view', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});

		workflowPage.actions.openNode('Set');
		ndv.actions.switchInputMode('JSON');

		ndv.getters
			.inputDataContainer()
			.should('exist')
			.find('.json-data')
			.should(
				'have.text',
				'[{"input":[{"count":0,"with space":"!!","with.dot":"!!","with"quotes":"!!"}]},{"input":[{"count":1}]}]',
			)
			.find('span')
			.contains('"count"')
			.realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
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
			.should('have.text', '{{ $json.input[0].count }} {{ $json.input }}');
		ndv.actions.validateExpressionPreview('value', '0 [object Object]');
	});

	it('maps expressions from schema view', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});

		workflowPage.actions.openNode('Set');
		ndv.actions.clearParameterInput('value');
		cy.get('body').type('{esc}');

		ndv.getters.inputDataContainer().should('exist').find('span').contains('count').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
		ndv.actions.validateExpressionPreview('value', '0');

		ndv.getters.inputDataContainer().find('span').contains('input').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', '{{ $json.input[0].count }} {{ $json.input }}');
		ndv.actions.validateExpressionPreview('value', '0 [object Object]');
	});

	it('maps expressions from previous nodes', () => {
		cy.createFixtureWorkflow('Test_workflow_3.json', `My test workflow`);
		workflowPage.actions.openNode('Set1');

		ndv.actions.selectInputNode(SCHEDULE_TRIGGER_NODE_NAME);

		ndv.getters.inputDataContainer().find('span').contains('count').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', `{{ $node['${SCHEDULE_TRIGGER_NODE_NAME}'].json.input[0].count }}`);
		ndv.getters.parameterExpressionPreview('value').should('not.exist');

		ndv.actions.switchInputMode('Table');
		ndv.actions.mapDataFromHeader(1, 'value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should(
				'have.text',
				`{{ $node['${SCHEDULE_TRIGGER_NODE_NAME}'].json.input[0].count }} {{ $node['${SCHEDULE_TRIGGER_NODE_NAME}'].json.input }}`,
			);
		ndv.actions.validateExpressionPreview('value', ' ');

		ndv.actions.selectInputNode('Set');

		ndv.actions.executePrevious();
		ndv.getters.executingLoader().should('not.exist');
		ndv.getters.inputDataContainer().should('exist');
		ndv.actions.validateExpressionPreview('value', '0 [object Object]');

		ndv.getters.inputTbodyCell(2, 0).realHover();
		ndv.actions.validateExpressionPreview('value', '1 [object Object]');
	});

	it('maps keys to path', () => {
		workflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		workflowPage.getters.canvasNodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		workflowPage.actions.openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		ndv.actions.setPinnedData([
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

		workflowPage.actions.addNodeToCanvas('Item Lists');
		workflowPage.actions.openNode('Item Lists');

		ndv.getters.parameterInput('operation').click().find('li').contains('Sort').click();

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

		workflowPage.actions.openNode('Set');

		ndv.actions.typeIntoParameterInput('value', 'delete me');
		ndv.actions.dismissMappingTooltip();

		ndv.actions.typeIntoParameterInput('name', 'test');

		ndv.actions.typeIntoParameterInput('value', 'fun');
		ndv.actions.clearParameterInput('value'); // keep focus on param

		ndv.getters.inputDataContainer().should('exist').find('span').contains('count').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters.inlineExpressionEditorInput().should('have.text', '{{ $json.input[0].count }}');
		ndv.actions.validateExpressionPreview('value', '0');

		ndv.getters.inputDataContainer().find('span').contains('input').realMouseDown();

		ndv.actions.mapToParameter('value');
		ndv.getters
			.inlineExpressionEditorInput()
			.should('have.text', '{{ $json.input[0].count }} {{ $json.input }}');
		ndv.actions.validateExpressionPreview('value', '0 [object Object]');
	});

	it('shows you can drop to inputs, including booleans', () => {
		cy.fixture('Test_workflow_3.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});

		workflowPage.actions.openNode('Set');
		ndv.actions.clearParameterInput('value');
		cy.get('body').type('{esc}');

		ndv.getters.parameterInput('keepOnlySet').find('input[type="checkbox"]').should('exist');
		ndv.getters.parameterInput('keepOnlySet').find('input[type="text"]').should('not.exist');
		ndv.getters.inputDataContainer().should('exist').find('span').contains('count').realMouseDown().realMouseMove(100, 100);
		cy.wait(50);

		ndv.getters.parameterInput('keepOnlySet').find('input[type="checkbox"]').should('not.exist');
		ndv.getters.parameterInput('keepOnlySet').find('input[type="text"]')
			.should('exist')
			.invoke('css', 'border')
			.then((border) => expect(border).to.include('1.5px dashed rgb(90, 76, 194)'));

		ndv.getters.parameterInput('value').find('input[type="text"]')
		.should('exist')
		.invoke('css', 'border')
		.then((border) => expect(border).to.include('1.5px dashed rgb(90, 76, 194)'));
	});

});
