import {
	onBeforeUnmount,
	onMounted,
	ref,
	toRef,
	toValue,
	watch,
	watchEffect,
	type MaybeRefOrGetter,
	type Ref,
} from 'vue';
import { closeCursorInfoBox } from '@/plugins/codemirror/tooltips/InfoBoxTooltip';
import { closeCompletion, completionStatus } from '@codemirror/autocomplete';
import {
	Compartment,
	EditorSelection,
	EditorState,
	Prec,
	type Extension,
	type SelectionRange,
} from '@codemirror/state';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	type ViewUpdate,
} from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from 'codemirror-lang-html-n8n';
import { lintGutter } from '@codemirror/lint';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { history, toggleComment, deleteCharBackward } from '@codemirror/commands';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '../plugins/codemirror/keymap';
import {
	codeEditorSyntaxHighlighting,
	codeEditorTheme,
	htmlEditorHighlighting,
} from '../components/CodeNodeEditor/theme';

export type CodeEditorLanguage = 'json' | 'html' | 'javaScript' | 'python';

export const useCodeEditor = ({
	editorRef,
	editorValue,
	language,
	placeholder,
	extensions = [],
	isReadOnly = false,
	theme = {},
	onChange = () => {},
	onViewUpdate = () => {},
}: {
	editorRef: MaybeRefOrGetter<HTMLElement | undefined>;
	language: MaybeRefOrGetter<CodeEditorLanguage>;
	editorValue?: MaybeRefOrGetter<string>;
	placeholder?: MaybeRefOrGetter<string>;
	extensions?: MaybeRefOrGetter<Extension[]>;
	isReadOnly?: MaybeRefOrGetter<boolean>;
	theme?: MaybeRefOrGetter<{ maxHeight?: string; minHeight?: string; rows?: number }>;
	onChange?: (viewUpdate: ViewUpdate) => void;
	onViewUpdate?: (viewUpdate: ViewUpdate) => void;
}) => {
	const editor = ref<EditorView>();
	const hasFocus = ref(false);
	const hasChanges = ref(false);
	const selection = ref<SelectionRange>(EditorSelection.cursor(0)) as Ref<SelectionRange>;
	const customExtensions = ref<Compartment>(new Compartment());
	const readOnlyExtensions = ref<Compartment>(new Compartment());
	const telemetryExtensions = ref<Compartment>(new Compartment());
	const languageExtensions = ref<Compartment>(new Compartment());
	const themeExtensions = ref<Compartment>(new Compartment());
	const autocompleteStatus = ref<'pending' | 'active' | null>(null);
	const dragging = ref(false);

	const EXTENSIONS_BY_LANGUAGE: Record<CodeEditorLanguage, Extension[]> = {
		javaScript: [javascript(), codeEditorSyntaxHighlighting],
		python: [python(), codeEditorSyntaxHighlighting],
		json: [json(), codeEditorSyntaxHighlighting],
		html: [html(), htmlEditorHighlighting],
	};

	function readEditorValue(): string {
		return editor.value?.state.doc.toString() ?? '';
	}

	function updateSelection(update: ViewUpdate) {
		const currentSelection = selection.value;
		const newSelection = update.state.selection.ranges[0];

		if (!currentSelection?.eq(newSelection)) {
			selection.value = newSelection;
		}
	}

	function onEditorUpdate(update: ViewUpdate) {
		autocompleteStatus.value = completionStatus(update.view.state);
		updateSelection(update);
		onViewUpdate(update);

		if (update.docChanged) {
			hasChanges.value = true;
			onChange(update);
		}
	}

	function blur() {
		if (editor.value) {
			editor.value.contentDOM.blur();
			closeCompletion(editor.value);
			closeCursorInfoBox(editor.value);
		}
	}

	function blurOnClickOutside(event: MouseEvent) {
		if (event.target && !dragging.value && !editor.value?.dom.contains(event.target as Node)) {
			blur();
		}
		dragging.value = false;
	}

	watch(toRef(editorRef), () => {
		const parent = toValue(editorRef);

		if (!parent) return;

		const initialValue = toValue(editorValue) ? toValue(editorValue) : toValue(placeholder);
		const state = EditorState.create({
			doc: initialValue,
			extensions: [
				customExtensions.value.of(toValue(extensions)),
				readOnlyExtensions.value.of([]),
				telemetryExtensions.value.of([]),
				languageExtensions.value.of([]),
				themeExtensions.value.of([]),
				EditorView.updateListener.of(onEditorUpdate),
				EditorView.focusChangeEffect.of((_, newHasFocus) => {
					hasFocus.value = newHasFocus;
					selection.value = state.selection.ranges[0];
					if (!newHasFocus) {
						autocompleteStatus.value = null;
					}
					return null;
				}),
				EditorView.contentAttributes.of({ 'data-gramm': 'false' }), // disable grammarly
				EditorView.domEventHandlers({
					mousedown: () => {
						dragging.value = true;
					},
				}),
				history(),
				lintGutter(),
				foldGutter(),
				dropCursor(),
				indentOnInput(),
				bracketMatching(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				Prec.highest(
					keymap.of([
						...tabKeyMap(),
						...enterKeyMap,
						...autocompleteKeyMap,
						...historyKeyMap,
						{ key: 'Mod-/', run: toggleComment },
						{ key: 'Backspace', run: deleteCharBackward, shift: deleteCharBackward },
					]),
				),
			],
		});

		if (editor.value) {
			editor.value.destroy();
		}
		editor.value = new EditorView({ parent, state, scrollTo: EditorView.scrollIntoView(0) });
	});

	watchEffect(() => {
		if (editor.value) {
			editor.value.dispatch({
				effects: customExtensions.value.reconfigure(toValue(extensions)),
			});
		}
	});

	watchEffect(() => {
		if (editor.value) {
			editor.value.dispatch({
				effects: languageExtensions.value.reconfigure(
					toValue(EXTENSIONS_BY_LANGUAGE[toValue(language)]),
				),
			});
		}
	});

	watchEffect(() => {
		if (editor.value) {
			editor.value.dispatch({
				effects: readOnlyExtensions.value.reconfigure([
					EditorState.readOnly.of(toValue(isReadOnly)),
					EditorView.editable.of(!toValue(isReadOnly)),
					lineNumbers(),
					EditorView.lineWrapping,
					highlightSpecialChars(),
				]),
			});
		}
	});

	watchEffect(() => {
		if (editor.value) {
			editor.value.dispatch({
				effects: themeExtensions.value.reconfigure(codeEditorTheme(toValue(theme))),
			});
		}
	});

	watch(toRef(editorValue), () => {
		if (!editor.value) return;

		const newValue = toValue(editorValue);
		const currentValue = readEditorValue();
		if (newValue === undefined || newValue === currentValue) return;

		editor.value.dispatch({
			changes: { from: 0, to: currentValue.length, insert: newValue },
		});
	});

	onMounted(() => {
		document.addEventListener('click', blurOnClickOutside);
	});

	onBeforeUnmount(() => {
		document.removeEventListener('click', blurOnClickOutside);
		editor.value?.destroy();
	});

	function setCursorPosition(pos: number | 'end'): void {
		if (pos === 'end') {
			pos = editor.value?.state.doc.length ?? 0;
		}
		editor.value?.dispatch({ selection: { head: pos, anchor: pos } });
	}

	function select(anchor: number, head: number | 'end' = 'end'): void {
		editor.value?.dispatch({
			selection: { anchor, head: head === 'end' ? editor.value?.state.doc.length ?? 0 : head },
		});
	}

	function getLine(lineNumber: number | 'last' | 'first') {
		if (!editor.value) return;

		const { doc } = editor.value.state;
		switch (lineNumber) {
			case 'first':
				return doc.lineAt(0);
			case 'last':
				return doc.lineAt(doc.length - 1);
			default:
				return doc.line(lineNumber);
		}
	}

	function selectLine(lineNumber: number | 'last' | 'first'): void {
		if (!editor.value) return;

		const line = getLine(lineNumber);

		if (!line) return;

		editor.value.dispatch({ selection: EditorSelection.range(line.from, line.to) });
	}

	function highlightLine(lineNumber: number | 'last' | 'first'): void {
		if (!editor.value) return;

		const line = getLine(lineNumber);

		if (!line) return;

		editor.value.dispatch({ selection: EditorSelection.cursor(line.from) });
	}

	const selectAll = () => select(0, 'end');

	function focus(): void {
		if (hasFocus.value) return;
		editor.value?.focus();
	}

	return {
		editor,
		hasFocus,
		hasChanges,
		selection,
		readEditorValue,
		setCursorPosition,
		select,
		selectLine,
		selectAll,
		highlightLine,
		focus,
		blur,
	};
};
