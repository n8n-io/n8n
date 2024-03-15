import { insertCompletionText, pickedCompletion } from '@codemirror/autocomplete';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, vi } from 'vitest';
import { useAutocompleteTelemetry } from '../useAutocompleteTelemetry';

const trackSpy = vi.fn();
const setAutocompleteOnboardedSpy = vi.fn();

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: trackSpy })),
}));

vi.mock('@/stores/ndv.store', () => ({
	useNDVStore: vi.fn(() => ({
		activeNode: { type: 'n8n-nodes-base.test' },
		setAutocompleteOnboarded: setAutocompleteOnboardedSpy,
	})),
}));

vi.mock('@/stores/n8nRoot.store', () => ({
	useRootStore: vi.fn(() => ({
		instanceId: 'test-instance-id',
	})),
}));

describe('useAutocompleteTelemetry', () => {
	const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;
	const originalRangeGetClientRects = Range.prototype.getClientRects;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeAll(() => {
		Range.prototype.getBoundingClientRect = vi.fn();
		Range.prototype.getClientRects = () => ({
			item: vi.fn(),
			length: 0,
			[Symbol.iterator]: vi.fn(),
		});
	});

	afterAll(() => {
		Range.prototype.getBoundingClientRect = originalRangeGetBoundingClientRect;
		Range.prototype.getClientRects = originalRangeGetClientRects;
	});

	const getEditor = (defaultDoc = '') => {
		const extensionCompartment = new Compartment();
		const state = EditorState.create({
			doc: defaultDoc,
			extensions: [extensionCompartment.of([])],
		});
		const editorRoot = document.createElement('div');
		return {
			editor: new EditorView({ parent: editorRoot, state }),
			editorRoot,
			compartment: extensionCompartment,
		};
	};

	test('should track user autocomplete', async () => {
		const { editor, compartment } = getEditor('$json.');
		useAutocompleteTelemetry({
			editor,
			parameterPath: 'param',
			compartment,
		});

		editor.dispatch({
			...insertCompletionText(editor.state, 'foo', 6, 6),
			annotations: pickedCompletion.of({ label: 'foo' }),
		});

		await waitFor(() =>
			expect(trackSpy).toHaveBeenCalledWith('User autocompleted code', {
				category: 'n/a',
				context: '$json',
				field_name: 'param',
				field_type: 'expression',
				inserted_text: 'foo',
				instance_id: 'test-instance-id',
				node_type: 'n8n-nodes-base.test',
			}),
		);
	});

	test('should mark user as onboarded on autocomplete', async () => {
		const { editor, compartment } = getEditor();
		useAutocompleteTelemetry({
			editor,
			parameterPath: 'param',
			compartment,
		});

		editor.dispatch({
			...insertCompletionText(editor.state, 'foo', 0, 0),
			annotations: pickedCompletion.of({ label: 'foo' }),
		});

		await waitFor(() => expect(setAutocompleteOnboardedSpy).toHaveBeenCalled());
	});
});
