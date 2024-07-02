import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import InlineExpressionEditorOutput from '../InlineExpressionEditorOutput.vue';

describe('InlineExpressionEditorOutput.vue', () => {
	test('should render duplicate segments correctly', async () => {
		const { getByTestId } = renderComponent(InlineExpressionEditorOutput, {
			pinia: createTestingPinia(),
			props: {
				hoveringItemNumber: 0,
				visible: true,
				segments: [
					{
						from: 0,
						to: 5,
						plaintext: '[1,2]',
						kind: 'plaintext',
					},
					{
						from: 0,
						to: 1,
						plaintext: '[',
						kind: 'plaintext',
					},
					{
						from: 1,
						to: 2,
						plaintext: '1',
						kind: 'plaintext',
					},
					{
						from: 2,
						to: 3,
						plaintext: ',',
						kind: 'plaintext',
					},
					{
						from: 3,
						to: 4,
						plaintext: '2',
						kind: 'plaintext',
					},
					{
						from: 4,
						to: 5,
						plaintext: ']',
						kind: 'plaintext',
					},
				],
			},
		});
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent('[1,2]');
	});

	test('should render segments with resolved expressions', () => {
		const { getByTestId } = renderComponent(InlineExpressionEditorOutput, {
			pinia: createTestingPinia(),
			props: {
				hoveringItemNumber: 0,
				visible: true,
				segments: [
					{
						kind: 'plaintext',
						from: 0,
						to: 6,
						plaintext: 'before>',
					},
					{
						kind: 'plaintext',
						from: 6,
						to: 7,
						plaintext: ' ',
					},
					{
						kind: 'resolvable',
						from: 7,
						to: 17,
						resolvable: '{{ $now }}',
						resolved: '[Object: "2024-04-18T09:03:26.651-04:00"]',
						state: 'valid',
						error: null,
					},
					{
						kind: 'plaintext',
						from: 17,
						to: 18,
						plaintext: ' ',
					},
					{
						kind: 'plaintext',
						from: 18,
						to: 24,
						plaintext: '<after',
					},
				],
			},
		});
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent(
			'before> [Object: "2024-04-18T09:03:26.651-04:00"] <after',
		);
	});
});
