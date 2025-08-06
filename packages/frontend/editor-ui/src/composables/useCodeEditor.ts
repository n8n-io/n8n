import { codeEditorTheme } from '@/components/CodeNodeEditor/theme';
import { editorKeymap } from '@/plugins/codemirror/keymap';
import { useTypescript } from '@/plugins/codemirror/typescript/client/useTypescript';
import { closeCursorInfoBox } from '@/plugins/codemirror/tooltips/InfoBoxTooltip';
import {
	closeBrackets,
	closeBracketsKeymap,
	closeCompletion,
	completionStatus,
} from '@codemirror/autocomplete';
import { history, historyField } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { bracketMatching, foldGutter, foldState, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import {
	Compartment,
	EditorSelection,
	EditorState,
	type EditorStateConfig,
	type Extension,
	type SelectionRange,
} from '@codemirror/state';
import {
	drawSelection,
	dropCursor,
	EditorView,
	highlightActiveLineGutter,
	highlightActiveLine,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	type ViewUpdate,
} from '@codemirror/view';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { html } from 'codemirror-lang-html-n8n';
import { jsonParse, type CodeExecutionMode, type IDataObject } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	toRef,
	toValue,
	watch,
	type MaybeRefOrGetter,
	type Ref,
} from 'vue';
import { useCompleter } from '../components/CodeNodeEditor/completer';
import { mappingDropCursor } from '../plugins/codemirror/dragAndDrop';
import { languageFacet, type CodeEditorLanguage } from '../plugins/codemirror/format';
import debounce from 'lodash/debounce';
import { ignoreUpdateAnnotation } from '../utils/forceParse';
import type { TargetNodeParameterContext } from '@/Interface';

export type CodeEditorLanguageParamsMap = {
	json: {};
	html: {};
	javaScript: { mode: CodeExecutionMode };
	python: { mode: CodeExecutionMode };
};

export const useCodeEditor = <L extends CodeEditorLanguage>({
	editorRef,
	editorValue,
	language,
	languageParams,
	placeholder,
	targetNodeParameterContext = undefined,
	extensions = [],
	isReadOnly = false,
	theme = {},
	onChange = () => {},
	id = uuid(),
}: {
	editorRef: MaybeRefOrGetter<HTMLElement | undefined>;
	language: MaybeRefOrGetter<L>;
	editorValue?: MaybeRefOrGetter<string>;
	placeholder?: MaybeRefOrGetter<string>;
	targetNodeParameterContext?: MaybeRefOrGetter<TargetNodeParameterContext | undefined>;
	extensions?: MaybeRefOrGetter<Extension[]>;
	isReadOnly?: MaybeRefOrGetter<boolean>;
	theme?: MaybeRefOrGetter<{
		maxHeight?: string;
		minHeight?: string;
		rows?: number;
	}>;
	languageParams?: MaybeRefOrGetter<CodeEditorLanguageParamsMap[L]>;
	id?: MaybeRefOrGetter<string>;
	onChange?: (viewUpdate: ViewUpdate) => void;
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
	const storedStateFields = { fold: foldState, history: historyField };

	const storedStateId = computed(() => `${toValue(id)}.editorState`);
	const mode = computed(() => {
		const params = toValue(languageParams);
		return params && 'mode' in params ? params.mode : 'runOnceForAllItems';
	});
	const { createWorker: createTsWorker } = useTypescript(
		editor,
		mode,
		id,
		targetNodeParameterContext,
	);

	function getInitialLanguageExtensions(lang: CodeEditorLanguage): Extension[] {
		switch (lang) {
			case 'javaScript':
				return [javascript()];
			default:
				return [];
		}
	}

	async function getFullLanguageExtensions(): Promise<Extension[]> {
		if (!editor.value) return [];
		const lang = toValue(language);
		const langExtensions: Extension[] = [languageFacet.of(lang)];

		switch (lang) {
			case 'javaScript': {
				const tsExtension = await createTsWorker();
				langExtensions.push(tsExtension);
				break;
			}
			case 'python': {
				const pythonAutocomplete = useCompleter(mode, editor.value ?? null).autocompletionExtension(
					'python',
				);
				langExtensions.push([python(), pythonAutocomplete]);
				break;
			}
			case 'json':
				langExtensions.push(json());
				break;
			case 'html':
				langExtensions.push(html());
				break;
		}

		return langExtensions;
	}

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

	const emitChanges = debounce(onChange, 300);

	function onEditorUpdate(update: ViewUpdate) {
		autocompleteStatus.value = completionStatus(update.view.state);
		updateSelection(update);

		const shouldIgnoreUpdate = update.transactions.some((tr) =>
			tr.annotation(ignoreUpdateAnnotation),
		);

		if (update.docChanged && !shouldIgnoreUpdate) {
			hasChanges.value = true;
			emitChanges(update);
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

	async function setLanguageExtensions() {
		if (!editor.value) return;
		const initialExtensions = getInitialLanguageExtensions(toValue(language));
		if (initialExtensions.length > 0) {
			editor.value.dispatch({
				effects: languageExtensions.value.reconfigure(initialExtensions),
			});
		}

		editor.value.dispatch({
			effects: languageExtensions.value.reconfigure(await getFullLanguageExtensions()),
		});
	}

	function getReadOnlyExtensions() {
		return [
			EditorState.readOnly.of(toValue(isReadOnly)),
			EditorView.editable.of(!toValue(isReadOnly)),
			highlightSpecialChars(),
		];
	}

	function setReadOnlyExtensions() {
		if (!editor.value) return;
		editor.value.dispatch({
			effects: readOnlyExtensions.value.reconfigure([getReadOnlyExtensions()]),
		});
	}

	watch(toRef(editorRef), async () => {
		const parent = toValue(editorRef);

		if (!parent) return;

		const initialValue = toValue(editorValue) ? toValue(editorValue) : toValue(placeholder);

		const allExtensions = [
			customExtensions.value.of(toValue(extensions)),
			readOnlyExtensions.value.of(getReadOnlyExtensions()),
			telemetryExtensions.value.of([]),
			languageExtensions.value.of(getInitialLanguageExtensions(toValue(language))),
			themeExtensions.value.of(codeEditorTheme(toValue(theme))),
			EditorView.updateListener.of(onEditorUpdate),
			EditorView.focusChangeEffect.of((_, newHasFocus) => {
				hasFocus.value = newHasFocus;
				selection.value = state.selection.ranges[0];
				if (!newHasFocus) {
					autocompleteStatus.value = null;
				}
				return null;
			}),
			EditorState.allowMultipleSelections.of(true),
			EditorView.clickAddsSelectionRange.of(
				(event) => event.altKey && !event.metaKey && !event.shiftKey,
			),
			EditorView.contentAttributes.of({ 'data-gramm': 'false' }), // disable grammarly
			EditorView.domEventHandlers({
				mousedown: () => {
					dragging.value = true;
				},
			}),
			highlightSelectionMatches({ minSelectionLength: 2 }),
			lineNumbers(),
			drawSelection(),
			foldGutter({
				markerDOM: (open) => {
					const svgNS = 'http://www.w3.org/2000/svg';
					const wrapper = document.createElement('div');
					wrapper.classList.add('cm-fold-marker');
					const svgElement = document.createElementNS(svgNS, 'svg');
					svgElement.setAttribute('viewBox', '0 0 10 10');
					svgElement.setAttribute('width', '10');
					svgElement.setAttribute('height', '10');
					const pathElement = document.createElementNS(svgNS, 'path');
					const d = open ? 'M1 3 L5 7 L9 3' : 'M3 1 L7 5 L3 9'; // Chevron paths
					pathElement.setAttribute('d', d);
					pathElement.setAttribute('fill', 'none');
					pathElement.setAttribute('stroke', 'currentColor');
					pathElement.setAttribute('stroke-width', '1.5');
					pathElement.setAttribute('stroke-linecap', 'round');
					svgElement.appendChild(pathElement);
					wrapper.appendChild(svgElement);
					return wrapper;
				},
			}),
			EditorView.lineWrapping,
			history(),
			dropCursor(),
			indentOnInput(),
			bracketMatching(),
			closeBrackets(),
			highlightActiveLine(),
			highlightActiveLineGutter(),
			mappingDropCursor(),
			indentationMarkers({
				highlightActiveBlock: true,
				markerType: 'fullScope',
				colors: {
					activeDark: 'var(--color-code-indentation-marker-active)',
					activeLight: 'var(--color-code-indentation-marker-active)',
					dark: 'var(--color-code-indentation-marker)',
					light: 'var(--color-code-indentation-marker)',
				},
			}),
			keymap.of(editorKeymap),
			keymap.of(closeBracketsKeymap),
		];

		const parsedStoredState = jsonParse<IDataObject | null>(
			localStorage.getItem(storedStateId.value) ?? '',
			{
				fallbackValue: null,
			},
		);
		const config: EditorStateConfig = {
			doc: initialValue,
			extensions: allExtensions,
		};

		const state =
			// Only restore from localstorage when code did not change
			parsedStoredState && parsedStoredState.doc === initialValue
				? EditorState.fromJSON(parsedStoredState, config, storedStateFields)
				: EditorState.create(config);

		if (editor.value) {
			editor.value.destroy();
		}
		editor.value = new EditorView({
			parent,
			state,
			scrollTo: EditorView.scrollIntoView(state.selection.main, { y: 'center' }),
		});

		editor.value.dispatch({
			effects: languageExtensions.value.reconfigure(await getFullLanguageExtensions()),
		});
	});

	watch(extensions, () => {
		if (editor.value) {
			editor.value.dispatch({
				effects: customExtensions.value.reconfigure(toValue(extensions)),
			});
		}
	});

	watch(toRef(language), setLanguageExtensions);

	watch(toRef(isReadOnly), setReadOnlyExtensions);

	watch(toRef(theme), () => {
		if (editor.value) {
			editor.value.dispatch({
				effects: themeExtensions.value.reconfigure(codeEditorTheme(toValue(theme))),
			});
		}
	});

	watch(toRef(editorValue), () => {
		if (!editor.value || hasFocus.value) return;

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

		if (editor.value) {
			const stateToStore = editor.value.state.toJSON(storedStateFields);
			try {
				localStorage.setItem(storedStateId.value, JSON.stringify(stateToStore));
			} catch (error) {
				// Code is too large, localStorage quota exceeded
				localStorage.removeItem(storedStateId.value);
			}

			emitChanges.flush();
			editor.value.destroy();
		}
	});

	function setCursorPosition(pos: number | 'end'): void {
		const finalPos = pos === 'end' ? (editor.value?.state.doc.length ?? 0) : pos;
		editor.value?.dispatch({ selection: { head: finalPos, anchor: finalPos } });
	}

	function select(anchor: number, head: number | 'end' = 'end'): void {
		editor.value?.dispatch({
			selection: {
				anchor,
				head: head === 'end' ? (editor.value?.state.doc.length ?? 0) : head,
			},
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

		editor.value.dispatch({
			selection: EditorSelection.range(line.from, line.to),
		});
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
