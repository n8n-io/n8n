import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import InlineExpressionEditorOutput from '../InlineExpressionEditorOutput.vue';

describe('InlineExpressionEditorOutput.vue', () => {
	test('should render duplicate segments correctly', async () => {
		const { getByTestId } = renderComponent(InlineExpressionEditorOutput, {
			pinia: createTestingPinia(),
			props: {
				hoveringItemNumber: 0,
				segments: [
					{
						from: 0,
						to: 6,
						plaintext: 'SELECT',
						kind: 'plaintext',
					},
					{
						from: 6,
						to: 7,
						plaintext: ' ',
						kind: 'plaintext',
					},
					{
						from: 7,
						to: 12,
						plaintext: '[1,2]',
						kind: 'plaintext',
					},
					{
						from: 7,
						to: 8,
						plaintext: '[',
						kind: 'plaintext',
					},
					{
						from: 8,
						to: 9,
						plaintext: '1',
						kind: 'plaintext',
					},
					{
						from: 9,
						to: 10,
						plaintext: ',',
						kind: 'plaintext',
					},
					{
						from: 10,
						to: 11,
						plaintext: '2',
						kind: 'plaintext',
					},
					{
						from: 11,
						to: 12,
						plaintext: ']',
						kind: 'plaintext',
					},
				],
			},
		});
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent('SELECT [1,2]');
	});
});
