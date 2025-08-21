import { type MaybeRefOrGetter, computed, toValue, watchEffect } from 'vue';
import { ExpressionExtensions } from 'n8n-workflow';
import { EditorView, type ViewUpdate } from '@codemirror/view';

import { useNDVStore } from '@/stores/ndv.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '../composables/useTelemetry';
import type { Compartment } from '@codemirror/state';
import debounce from 'lodash/debounce';

export const useAutocompleteTelemetry = ({
	editor: editorRef,
	parameterPath,
	compartment,
}: {
	editor: MaybeRefOrGetter<EditorView | undefined>;
	parameterPath: MaybeRefOrGetter<string>;
	compartment: MaybeRefOrGetter<Compartment>;
}) => {
	const ndvStore = useNDVStore();
	const rootStore = useRootStore();
	const telemetry = useTelemetry();

	const expressionExtensionsCategories = computed(() => {
		return ExpressionExtensions.reduce<Record<string, string | undefined>>((acc, cur) => {
			for (const fnName of Object.keys(cur.functions)) {
				acc[fnName] = cur.typeName;
			}

			return acc;
		}, {});
	});

	function findCompletionBaseStartIndex(fromIndex: number) {
		const editor = toValue(editorRef);

		if (!editor) return -1;

		const INDICATORS = [
			' $', // proxy
			'{ ', // primitive
		];

		const doc = editor.state.doc.toString();

		for (let index = fromIndex; index > 0; index--) {
			if (INDICATORS.some((indicator) => indicator === doc[index] + doc[index + 1])) {
				return index + 1;
			}
		}

		return -1;
	}

	function trackCompletion(viewUpdate: ViewUpdate, path: string) {
		const editor = toValue(editorRef);

		if (!editor) return;
		const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

		if (!completionTx) return;

		ndvStore.setAutocompleteOnboarded();

		let completion = '';
		let completionBase = '';

		viewUpdate.changes.iterChanges((_: number, __: number, fromB: number, toB: number) => {
			completion = toValue(editor).state.doc.slice(fromB, toB).toString();

			const index = findCompletionBaseStartIndex(fromB);

			completionBase = toValue(editor)
				.state.doc.slice(index, fromB - 1)
				.toString()
				.trim();
		});

		const category = expressionExtensionsCategories.value[completion];

		const payload = {
			instance_id: rootStore.instanceId,
			node_type: ndvStore.activeNode?.type,
			field_name: path,
			field_type: 'expression',
			context: completionBase,
			inserted_text: completion,
			category: category ?? 'n/a', // only applicable if expression extension completion
		};

		telemetry.track('User autocompleted code', payload);
	}

	const safeTrackCompletion = (viewUpdate: ViewUpdate, path: string) => {
		try {
			trackCompletion(viewUpdate, path);
		} catch {}
	};
	const debouncedTrackCompletion = debounce(safeTrackCompletion, 100);

	watchEffect(() => {
		const editor = toValue(editorRef);
		if (!editor) return;

		editor.dispatch({
			effects: toValue(compartment).reconfigure([
				EditorView.updateListener.of((viewUpdate) => {
					if (!viewUpdate.docChanged || !editor) return;
					debouncedTrackCompletion(viewUpdate, toValue(parameterPath));
				}),
			]),
		});
	});
};
