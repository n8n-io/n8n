import { createComponentRenderer } from '@/__tests__/render';
import ExpressionParameterInput from './ExpressionParameterInput.vue';
import { type TestingPinia, createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';

vi.mock('@/features/ndv/shared/ndv.store', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	const useNDVStoreFn = actual.useNDVStore as (id: string) => unknown;
	const { createWorkflowDocumentId: makeDocId } = await import(
		'@/app/stores/workflowDocument.store'
	);
	const { shallowRef: makeShallow } = await import('vue');
	return {
		...actual,
		injectNDVStore: vi.fn(() => makeShallow(useNDVStoreFn(makeDocId('default')))),
	};
});

describe('ExpressionParameterInput', () => {
	const renderComponent = createComponentRenderer(ExpressionParameterInput);
	let pinia: TestingPinia;

	beforeEach(() => {
		pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	test.each([
		['not readonly', false, expect.anything()],
		['readonly', true, expect.anything()],
	])('should emit open expression editor modal when %s', async (_, isReadOnly, expected) => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: '',
				isReadOnly,
			},
		});

		await userEvent.click(getByTestId('expander'));
		expect(emitted()['modal-opener-click']).toEqual(expected);
	});

	test('it should only emit blur when input had focus', async () => {
		const { getByTestId, emitted, baseElement } = renderComponent({
			props: {
				modelValue: '={{$json.foo}}',
			},
		});

		// trigger click outside -> blur
		await userEvent.click(baseElement);
		expect(emitted('blur')).toBeUndefined();

		// focus expression editor
		await userEvent.click(
			getByTestId('inline-expression-editor-input').querySelector('.cm-line') as Element,
		);
		// trigger click outside -> blur
		await userEvent.click(baseElement);
		expect(emitted('blur')).toHaveLength(1);
	});

	describe('in read-only mode', () => {
		test('it should render a read-only expression input', async () => {
			const { container } = renderComponent({
				props: {
					modelValue: '={{$json.foo}}',
					isReadOnly: true,
				},
			});

			await waitFor(() => {
				const editor = container.querySelector('.cm-content') as HTMLDivElement;
				expect(editor).toBeInTheDocument();
				expect(editor.getAttribute('aria-readonly')).toEqual('true');
			});
		});
	});
});
