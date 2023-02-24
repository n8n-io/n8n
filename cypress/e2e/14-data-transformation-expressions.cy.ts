import { WorkflowPage, NDV } from '../pages';

const wf = new WorkflowPage();
const ndv = new NDV();

describe('Data transformation expressions', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		wf.actions.visit();
		cy.waitForLoad();

		cy.window()
			// @ts-ignore
			.then(win => win.onBeforeUnload && win.removeEventListener('beforeunload', win.onBeforeUnload));
	});

	it('$json + native string methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myStr: 'Monday' }]);
		ndv.actions.close();
		addSet();

		const input = '{{$json.myStr.toLowerCase() + " is " + "today".toUpperCase()';
		const output = 'monday is TODAY';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible')
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + n8n string methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myStr: 'hello@n8n.io is an email' }]);
		ndv.actions.close();
		addSet();

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()';
		const output = 'hello@n8n.io false';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible')
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + native numeric methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myNum: 9.123 }]);
		ndv.actions.close();
		addSet();

		const input = '{{$json.myNum.toPrecision(3)';
		const output = '9.12';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible')
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + n8n numeric methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myStr: 'hello@n8n.io is an email' }]);
		ndv.actions.close();
		addSet();

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()';
		const output = 'hello@n8n.io false';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible')
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + native array methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myArr: [1, 2, 3] }]);
		ndv.actions.close();
		addSet();

		const input = '{{$json.myArr.includes(1) + " " + $json.myArr.at(2)';
		const output = 'true 3';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible')
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + n8n array methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myArr: [1, 2, 3] }]);
		ndv.actions.close();
		addSet();

		const input = '{{$json.myArr.first() + " " + $json.myArr.last()';
		const output = '1 3';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible').contains(output);
	});
});

// ----------------------------------
//             utils
// ----------------------------------

const addSet = () => {
	wf.actions.addNodeToCanvas('Set', true, true);
	ndv.getters.parameterInput('keepOnlySet').find('div[role=switch]').click(); // shorten output
	cy.get('input[placeholder="Add Value"]').click();
	cy.get('span').contains('String').click();
	ndv.getters.nthParam(3).contains('Expression').invoke('show').click(); // Values to Set > String > Value
};
