import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export interface CodeMirrorEditorOptions {
	container: Ref<HTMLDivElement | null | undefined>;
	initialDoc: string;
	extensions: Extension[];
	/** Reactive read-only flag — toggles via a Compartment, no editor rebuild. */
	readOnly: Ref<boolean>;
	/** Fires on user-initiated doc changes. Programmatic `replaceDoc` is suppressed. */
	onChange: (nextDoc: string) => void;
}

export interface CodeMirrorEditorHandle {
	/** Replace the entire doc without firing `onChange`. No-op when content matches. */
	replaceDoc: (nextDoc: string) => void;
	/** Imperatively flip read-only without going through the ref. */
	setReadOnly: (readOnly: boolean) => void;
	/** Escape hatch — exposes the underlying view (e.g. to read the current doc for copy). */
	getView: () => EditorView | null;
}

/**
 * Three different editor wrappers used to repeat the same setup: track a `view`,
 * a programmatic-update flag to suppress self-emits, a Compartment for
 * reactive read-only, and identical mount/destroy lifecycles. This composable
 * owns those concerns so the components only declare their language + theme
 * extensions and react to changes.
 */
export function useCodeMirrorEditor(options: CodeMirrorEditorOptions): CodeMirrorEditorHandle {
	let view: EditorView | null = null;
	let isProgrammatic = false;
	const readOnlyCompartment = new Compartment();

	const readOnlyExtensions = (ro: boolean): Extension =>
		ro ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [];

	onMounted(() => {
		if (!options.container.value) return;
		view = new EditorView({
			state: EditorState.create({
				doc: options.initialDoc,
				extensions: [
					...options.extensions,
					readOnlyCompartment.of(readOnlyExtensions(options.readOnly.value)),
					EditorView.updateListener.of((update) => {
						if (!update.docChanged || isProgrammatic) return;
						options.onChange(update.state.doc.toString());
					}),
				],
			}),
			parent: options.container.value,
		});
	});

	onBeforeUnmount(() => {
		view?.destroy();
		view = null;
	});

	watch(options.readOnly, (ro) => {
		view?.dispatch({ effects: readOnlyCompartment.reconfigure(readOnlyExtensions(ro)) });
	});

	return {
		replaceDoc(nextDoc) {
			if (!view) return;
			const current = view.state.doc.toString();
			if (current === nextDoc) return;
			isProgrammatic = true;
			view.dispatch({ changes: { from: 0, to: current.length, insert: nextDoc } });
			isProgrammatic = false;
		},
		setReadOnly(ro) {
			view?.dispatch({ effects: readOnlyCompartment.reconfigure(readOnlyExtensions(ro)) });
		},
		getView: () => view,
	};
}
