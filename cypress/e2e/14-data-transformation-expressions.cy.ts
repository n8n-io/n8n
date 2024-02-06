import { WorkflowPage, NDV } from '../pages';
import { getVisibleSelect } from '../utils';

const wf = new WorkflowPage();
const ndv = new NDV();

describe('Data transformation expressions', () => {
	beforeEach(() => {
		wf.actions.visit();
	});

	it('$json + native string methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myStr: 'Monday' }]);
		ndv.actions.close();
		addEditFields();

		const input = '{{$json.myStr.toLowerCase() + " is " + "today".toUpperCase()';
		const output = 'monday is TODAY';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible');
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + n8n string methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myStr: 'hello@n8n.io is an email' }]);
		ndv.actions.close();
		addEditFields();

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()';
		const output = 'hello@n8n.io false';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible');
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + native numeric methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myNum: 9.123 }]);
		ndv.actions.close();
		addEditFields();

		const input = '{{$json.myNum.toPrecision(3)';
		const output = '9.12';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible');
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + n8n numeric methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myStr: 'hello@n8n.io is an email' }]);
		ndv.actions.close();
		addEditFields();

		const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()';
		const output = 'hello@n8n.io false';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().should('be.visible');
		ndv.getters.outputDataContainer().contains(output);
	});

	it('$json + native array access', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myArr: [1, 2, 3] }]);
		ndv.actions.close();
		addEditFields();
		const input = '{{$json.myArr.includes(1) + " " + $json.myArr[2]';
		const output = 'true 3';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().find('[class*=value_]').should('exist');
		ndv.getters.outputDataContainer().find('[class*=value_]').should('contain', output);
	});

	it('$json + n8n array methods', () => {
		wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.actions.setPinnedData([{ myArr: [1, 2, 3] }]);
		ndv.actions.close();
		addEditFields();

		const input = '{{$json.myArr.first() + " " + $json.myArr.last()';
		const output = '1 3';

		ndv.getters.inlineExpressionEditorInput().clear().type(input);
		ndv.actions.execute();
		ndv.getters.outputDataContainer().find('[class*=value_]').should('exist');
		ndv.getters.outputDataContainer().find('[class*=value_]').should('contain', output);
	});
});

// ----------------------------------
//             utils
// ----------------------------------

const addEditFields = () => {
	wf.actions.addNodeToCanvas('Edit Fields', true, true);
	ndv.getters.assignmentCollectionAdd('assignments').click();
	ndv.getters.assignmentValue('assignments').contains('Expression').invoke('show').click();
};
