import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import { EditorView } from '@codemirror/view';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, vi } from 'vitest';
import { ref, toValue } from 'vue';
import { n8nLang } from '../../plugins/codemirror/n8nLang';
import { useExpressionEditor } from '../useExpressionEditor';
import { useRouter } from 'vue-router';
import { EditorSelection } from '@codemirror/state';

vi.mock('@/composables/useAutocompleteTelemetry', () => ({
	useAutocompleteTelemetry: vi.fn(),
}));

vi.mock('@/stores/ndv.store', () => ({
	useNDVStore: vi.fn(() => ({
		activeNode: { type: 'n8n-nodes-base.test' },
	})),
}));

describe('useExpressionEditor', () => {
	const mockResolveExpression = () => {
		const mock = vi.fn();
		vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockReturnValueOnce({
			...workflowHelpers.useWorkflowHelpers({ router: useRouter() }),
			resolveExpression: mock,
		});

		return mock;
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('should create an editor', async () => {
		const root = ref<HTMLElement>();
		const { editor } = useExpressionEditor({
			editorRef: root,
		});

		root.value = document.createElement('div');

		await waitFor(() => expect(toValue(editor)).toBeInstanceOf(EditorView));
	});

	test('should calculate segments', async () => {
		mockResolveExpression().mockReturnValueOnce(15);
		const root = ref<HTMLElement>();
		const { segments } = useExpressionEditor({
			editorRef: root,
			editorValue: 'before {{ $json.test.length }} after',
			extensions: [n8nLang()],
		});

		root.value = document.createElement('div');

		await waitFor(() => {
			expect(toValue(segments.all)).toEqual([
				{
					from: 0,
					kind: 'plaintext',
					plaintext: 'before ',
					to: 7,
				},
				{
					error: null,
					from: 7,
					kind: 'resolvable',
					resolvable: '{{ $json.test.length }}',
					resolved: '15',
					state: 'valid',
					to: 30,
				},
				{
					from: 30,
					kind: 'plaintext',
					plaintext: ' after',
					to: 36,
				},
			]);

			expect(toValue(segments.resolvable)).toEqual([
				{
					error: null,
					from: 7,
					kind: 'resolvable',
					resolvable: '{{ $json.test.length }}',
					resolved: '15',
					state: 'valid',
					to: 30,
				},
			]);

			expect(toValue(segments.plaintext)).toEqual([
				{
					from: 0,
					kind: 'plaintext',
					plaintext: 'before ',
					to: 7,
				},
				{
					from: 30,
					kind: 'plaintext',
					plaintext: ' after',
					to: 36,
				},
			]);
		});
	});

	describe('readEditorValue()', () => {
		test('should return the full editor value (unresolved)', async () => {
			mockResolveExpression().mockReturnValueOnce(15);
			const root = ref<HTMLElement>();
			const { readEditorValue } = useExpressionEditor({
				editorRef: root,
				editorValue: 'before {{ $json.test.length }} after',
				extensions: [n8nLang()],
			});

			root.value = document.createElement('div');

			await waitFor(() =>
				expect(readEditorValue()).toEqual('before {{ $json.test.length }} after'),
			);
		});
	});

	describe('setCursorPosition()', () => {
		test('should set cursor position to number correctly', async () => {
			const root = ref<HTMLElement>();
			const editorValue = 'text here';
			const { editor, setCursorPosition } = useExpressionEditor({
				editorRef: root,
				editorValue,
				extensions: [],
			});

			root.value = document.createElement('div');
			await waitFor(() => toValue(editor));
			setCursorPosition(4);

			await waitFor(() =>
				expect(toValue(editor)?.state.selection).toEqual(EditorSelection.single(4)),
			);
		});

		test('should set cursor position to end correctly', async () => {
			const root = ref<HTMLElement>();
			const editorValue = 'text here';
			const correctPosition = editorValue.length;
			const { editor, setCursorPosition } = useExpressionEditor({
				editorRef: root,
				editorValue,
				extensions: [],
			});

			root.value = document.createElement('div');
			await waitFor(() => toValue(editor));
			setCursorPosition('end');

			await waitFor(() =>
				expect(toValue(editor)?.state.selection).toEqual(EditorSelection.single(correctPosition)),
			);
		});

		test('should set cursor position to last expression correctly', async () => {
			const root = ref<HTMLElement>();
			const editorValue = 'text {{ $json.foo }} {{ $json.bar }} here';
			const correctPosition = editorValue.indexOf('bar') + 'bar'.length;
			const { editor, setCursorPosition } = useExpressionEditor({
				editorRef: root,
				editorValue,
				extensions: [n8nLang()],
			});

			root.value = document.createElement('div');
			await waitFor(() => toValue(editor));
			setCursorPosition('lastExpression');

			await waitFor(() =>
				expect(toValue(editor)?.state.selection).toEqual(EditorSelection.single(correctPosition)),
			);
		});
	});

	describe('select()', () => {
		test('should select number range', async () => {
			const root = ref<HTMLElement>();
			const editorValue = 'text here';
			const { editor, select } = useExpressionEditor({
				editorRef: root,
				editorValue,
				extensions: [],
			});

			root.value = document.createElement('div');
			await waitFor(() => toValue(editor));
			select(4, 7);

			await waitFor(() =>
				expect(toValue(editor)?.state.selection).toEqual(EditorSelection.single(4, 7)),
			);
		});

		test('should select until end', async () => {
			const root = ref<HTMLElement>();
			const editorValue = 'text here';
			const { editor, select } = useExpressionEditor({
				editorRef: root,
				editorValue,
				extensions: [],
			});

			root.value = document.createElement('div');
			await waitFor(() => toValue(editor));
			select(4, 'end');

			await waitFor(() =>
				expect(toValue(editor)?.state.selection).toEqual(EditorSelection.single(4, 9)),
			);
		});
	});

	describe('selectAll()', () => {
		test('should select all', async () => {
			const root = ref<HTMLElement>();
			const editorValue = 'text here';
			const { editor, selectAll } = useExpressionEditor({
				editorRef: root,
				editorValue,
				extensions: [],
			});

			root.value = document.createElement('div');
			await waitFor(() => toValue(editor));
			selectAll();

			await waitFor(() =>
				expect(toValue(editor)?.state.selection).toEqual(EditorSelection.single(0, 9)),
			);
		});
	});
});
