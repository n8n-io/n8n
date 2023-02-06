import { WorkflowPage, NDV } from '../pages';

const wf = new WorkflowPage();
const ndv = new NDV();

describe('Data transformation expressions', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
		cy.waitForLoad();
	});

	it('$json + native string methods', () => {
		wf.actions.visit();

		addWithPinData('Schedule Trigger', [{ myStr: 'Monday' }]);
		addSet();

		const input = '{{$json.myStr.toLowerCase() + " is " + "today".toUpperCase()';
		const output = 'monday is TODAY';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().contains(output).should('be.visible');
	});

	it('$json + n8n string methods', () => {
		wf.actions.visit();

		addWithPinData('Schedule Trigger', [{ myStr: 'hello@n8n.io is an email' }]);
		addSet();

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()';
		const output = 'hello@n8n.io false';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().contains(output).should('be.visible');
	});

	it('$json + native numeric methods', () => {
		wf.actions.visit();

		addWithPinData('Schedule Trigger', [{ myNum: 9.123 }]);
		addSet();

		const input = '{{$json.myNum.toPrecision(3)';
		const output = '9.12';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().contains(output).should('be.visible');
	});

	it('$json + n8n numeric methods', () => {
		wf.actions.visit();

		addWithPinData('Schedule Trigger', [{ myStr: 'hello@n8n.io is an email' }]);
		addSet();

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()';
		const output = 'hello@n8n.io false';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().contains(output).should('be.visible');
	});

	it('$json + native array methods', () => {
		wf.actions.visit();

		addWithPinData('Schedule Trigger', [{ myArr: [1, 2, 3] }]);
		addSet();

		const input = '{{$json.myArr.includes(1) + " " + $json.myArr.at(2)';
		const output = 'true 3';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().contains(output).should('be.visible');
	});

	it('$json + n8n array methods', () => {
		wf.actions.visit();

		addWithPinData('Schedule Trigger', [{ myArr: [1, 2, 3] }]);
		addSet();

		const input = '{{$json.myArr.first() + " " + $json.myArr.last()';
		const output = '1 3';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().contains(output).should('be.visible');
	});
});

// ----------------------------------
//             utils
// ----------------------------------

const addWithPinData = (nodeTypeName: string, pinData: object[]) => {
	wf.actions.addInitialNodeToCanvas(nodeTypeName, { preventNdvClose: true });
	ndv.actions.setPinnedData(pinData);
	ndv.actions.close();
};

const addSet = () => {
	wf.actions.addNodeToCanvas('Set', true, true);
	ndv.getters.parameterInput('keepOnlySet').find('div[role=switch]').click(); // shorten output
	cy.get('input[placeholder="Add Value"]').click();
	cy.get('span').contains('String').click();
	ndv.getters.nthParam(3).contains('Expression').invoke('show').click(); // Values to Set > String > Value
};
