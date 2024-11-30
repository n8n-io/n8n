import { renderComponent } from '@/__tests__/render';
import InlineExpressionTip from '@/components/InlineExpressionEditor/InlineExpressionTip.vue';
import { FIELDS_SECTION } from '@/plugins/codemirror/completions/constants';
import type { useNDVStore } from '@/stores/ndv.store';
import type { CompletionResult } from '@codemirror/autocomplete';
import { EditorSelection, EditorState } from '@codemirror/state';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';

let mockNdvState: Partial<ReturnType<typeof useNDVStore>>;
let mockCompletionResult: Partial<CompletionResult>;

vi.mock('@/stores/ndv.store', () => {
	return {
		useNDVStore: vi.fn(() => mockNdvState),
	};
});

vi.mock('@/plugins/codemirror/completions/datatype.completions', () => {
	return {
		datatypeCompletions: vi.fn(() => mockCompletionResult),
	};
});

describe('InlineExpressionTip.vue', () => {
	beforeEach(() => {
		mockNdvState = {
			hasInputData: true,
			isInputPanelEmpty: true,
			isOutputPanelEmpty: true,
			setHighlightDraggables: vi.fn(),
		};
	});

	test('should show the default tip', async () => {
		const { container } = renderComponent(InlineExpressionTip, {
			pinia: createTestingPinia(),
		});
		expect(container).toHaveTextContent('Tip: Anything inside {{ }} is JavaScript. Learn more');
	});

	describe('When the NDV input is not empty and a mappable input is focused', () => {
		test('should show the drag-n-drop tip', async () => {
			mockNdvState = {
				hasInputData: true,
				isInputPanelEmpty: false,
				isOutputPanelEmpty: false,
				focusedMappableInput: 'Some Input',
				setHighlightDraggables: vi.fn(),
			};
			const { container, unmount } = renderComponent(InlineExpressionTip, {
				pinia: createTestingPinia(),
			});
			expect(mockNdvState.setHighlightDraggables).toHaveBeenCalledWith(true);
			expect(container).toHaveTextContent('Tip: Drag aninput fieldfrom the left to use it here.');

			unmount();
			expect(mockNdvState.setHighlightDraggables).toHaveBeenCalledWith(false);
		});
	});

	describe('When the node has no input data', () => {
		test('should show the execute previous nodes tip', async () => {
			mockNdvState = {
				hasInputData: false,
				isInputParentOfActiveNode: true,
				isInputPanelEmpty: false,
				isOutputPanelEmpty: false,
				focusedMappableInput: 'Some Input',
				setHighlightDraggables: vi.fn(),
			};
			const { container } = renderComponent(InlineExpressionTip, {
				pinia: createTestingPinia(),
			});
			expect(container).toHaveTextContent('Tip: Execute previous nodes to use input data');
		});
	});

	describe('When the expression can be autocompleted with a dot', () => {
		test('should show the correct tip for objects', async () => {
			mockNdvState = {
				hasInputData: true,
				isInputPanelEmpty: false,
				isOutputPanelEmpty: false,
				focusedMappableInput: 'Some Input',
				setHighlightDraggables: vi.fn(),
			};
			mockCompletionResult = { options: [{ label: 'foo', section: FIELDS_SECTION }] };
			const selection = EditorSelection.cursor(8);
			const expression = '{{ $json }}';
			const { rerender, container } = renderComponent(InlineExpressionTip, {
				pinia: createTestingPinia(),
			});

			await rerender({
				editorState: EditorState.create({
					doc: expression,
					selection: EditorSelection.create([selection]),
				}),
				selection,
				unresolvedExpression: expression,
			});
			await waitFor(() =>
				expect(container).toHaveTextContent(
					'Tip: Type . for data transformation options, or to access fields. Learn more',
				),
			);
		});

		test('should show the correct tip for primitives', async () => {
			mockNdvState = {
				hasInputData: true,
				isInputPanelEmpty: false,
				isOutputPanelEmpty: false,
				focusedMappableInput: 'Some Input',
				setHighlightDraggables: vi.fn(),
			};
			mockCompletionResult = { options: [{ label: 'foo' }] };
			const selection = EditorSelection.cursor(12);
			const expression = '{{ $json.foo }}';
			const { rerender, container } = renderComponent(InlineExpressionTip, {
				pinia: createTestingPinia(),
			});

			await rerender({
				editorState: EditorState.create({
					doc: expression,
					selection: EditorSelection.create([selection]),
				}),
				selection,
				unresolvedExpression: expression,
			});
			await waitFor(() =>
				expect(container).toHaveTextContent(
					'Tip: Type . for data transformation options. Learn more',
				),
			);
		});
	});
});
