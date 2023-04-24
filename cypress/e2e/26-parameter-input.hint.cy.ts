import { WorkflowPage, NDV } from '../pages';

const wf = new WorkflowPage();
const ndv = new NDV();

describe('Parameter input hint', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	[
		{
			name: 'should display a regular string',
			pinData: [{ regular_string: 'hello' }],
			input: '{{ $json.regular_string',
			output: 'hello',
		},
		{
			name: 'should display `[empty]` for a zero-length string',
			pinData: [{ empty_string: '' }],
			input: '{{ $json.empty_string',
			output: '[empty]',
		},
		{
			name: 'should display ` ` for a single-whitespace string',
			pinData: [{ single_whitespace_string: ' ' }],
			input: '{{ $json.single_whitespace_string',
			output: ' ',
		},
	].forEach(({ name, pinData, input, output }) => {
		it(name, () => {
			wf.actions.visit();
			wf.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
			ndv.actions.setPinnedData(pinData);
			ndv.actions.close();

			wf.actions.addNodeToCanvas('Set', true, true);
			cy.get('input[placeholder="Add Value"]').click();
			cy.get('span').contains('String').click();
			ndv.getters.nthParam(3).contains('Expression').invoke('show').click();

			ndv.getters.inlineExpressionEditorInput().clear().type(input);
			cy.get('[data-test-id="parameter-input-hint"]').should('contain', output);
		});
	});
});
