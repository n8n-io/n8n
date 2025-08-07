import {
	computed,
	inject,
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

import { ensureSyntaxTree } from '@codemirror/language';
import type { IDataObject } from 'n8n-workflow';
import { Expression, ExpressionExtensions } from 'n8n-workflow';

import { EXPRESSION_EDITOR_PARSER_TIMEOUT, ExpressionLocalResolveContextSymbol } from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';

import type { TargetItem, TargetNodeParameterContext } from '@/Interface';
import { type ResolveParameterOptions, useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { closeCursorInfoBox } from '@/plugins/codemirror/tooltips/InfoBoxTooltip';
import type { Html, Plaintext, RawSegment, Resolvable, Segment } from '@/types/expressions';
import { getExpressionErrorMessage, getResolvableState } from '@/utils/expressions';
import { closeCompletion, completionStatus } from '@codemirror/autocomplete';
import {
	Compartment,
	EditorSelection,
	EditorState,
	type Extension,
	type SelectionRange,
} from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '../stores/workflows.store';
import { useAutocompleteTelemetry } from './useAutocompleteTelemetry';
import { ignoreUpdateAnnotation } from '../utils/forceParse';
import { TARGET_NODE_PARAMETER_FACET } from '@/plugins/codemirror/completions/constants';

export const useExpressionEditor = ({
	editorRef,
	editorValue,
	targetNodeParameterContext,
	extensions = [],
	additionalData = {},
	skipSegments = [],
	autocompleteTelemetry,
	isReadOnly = false,
	onChange = () => {},
}: {
	editorRef: MaybeRefOrGetter<HTMLElement | undefined>;
	editorValue?: MaybeRefOrGetter<string>;
	targetNodeParameterContext?: MaybeRefOrGetter<TargetNodeParameterContext>;
	extensions?: MaybeRefOrGetter<Extension[]>;
	additionalData?: MaybeRefOrGetter<IDataObject>;
	skipSegments?: MaybeRefOrGetter<string[]>;
	autocompleteTelemetry?: MaybeRefOrGetter<{ enabled: true; parameterPath: string }>;
	isReadOnly?: MaybeRefOrGetter<boolean>;
	onChange?: (viewUpdate: ViewUpdate) => void;
}) => {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const workflowHelpers = useWorkflowHelpers();
	const i18n = useI18n();
	const editor = ref<EditorView>();
	const hasFocus = ref(false);
	const segments = ref<Segment[]>([]);
	const selection = ref<SelectionRange>(EditorSelection.cursor(0)) as Ref<SelectionRange>;
	const customExtensions = ref<Compartment>(new Compartment());
	const readOnlyExtensions = ref<Compartment>(new Compartment());
	const telemetryExtensions = ref<Compartment>(new Compartment());
	const autocompleteStatus = ref<'pending' | 'active' | null>(null);
	const dragging = ref(false);
	const hasChanges = ref(false);
	const expressionLocalResolveContext = inject(
		ExpressionLocalResolveContextSymbol,
		computed(() => undefined),
	);

	const emitChanges = debounce(onChange, 300);

	const updateSegments = (): void => {
		const state = editor.value?.state;
		if (!state) return;

		const rawSegments: RawSegment[] = [];

		const fullTree = ensureSyntaxTree(state, state.doc.length, EXPRESSION_EDITOR_PARSER_TIMEOUT);

		if (fullTree === null) return;

		const skip = ['Program', 'Script', 'Document', ...toValue(skipSegments)];

		fullTree.cursor().iterate((node) => {
			const text = state.sliceDoc(node.from, node.to);

			if (skip.includes(node.type.name)) return;

			const newSegment: RawSegment = {
				from: node.from,
				to: node.to,
				text,
				token: node.type.name === 'Resolvable' ? 'Resolvable' : 'Plaintext',
			};

			// Avoid duplicates
			if (isEqual(newSegment, rawSegments.at(-1))) return;

			rawSegments.push(newSegment);
		});

		segments.value = rawSegments.reduce<Segment[]>((acc, segment) => {
			const { from, to, text, token } = segment;

			if (token === 'Resolvable') {
				const { resolved, error, fullError } = resolve(text, targetItem.value);
				acc.push({
					kind: 'resolvable',
					from,
					to,
					resolvable: text,
					// TODO:
					// For some reason, expressions that resolve to a number 0 are breaking preview in the SQL editor
					// This fixes that but as as TODO we should figure out why this is happening
					resolved: String(resolved),
					state: getResolvableState(fullError ?? error, autocompleteStatus.value !== null),
					error: fullError,
				});

				return acc;
			}

			acc.push({ kind: 'plaintext', from, to, plaintext: text });

			return acc;
		}, []);
		if (
			segments.value.length === 1 &&
			segments.value[0]?.kind === 'resolvable' &&
			segments.value[0]?.resolved === ''
		)
			segments.value[0].resolved = i18n.baseText('expressionModalInput.empty');
	};

	function readEditorValue(): string {
		return editor.value?.state.doc.toString() ?? '';
	}

	function updateHighlighting(): void {
		if (!editor.value) return;
		highlighter.removeColor(editor.value, plaintextSegments.value);
		highlighter.addColor(editor.value, resolvableSegments.value);
	}

	function updateSelection(viewUpdate: ViewUpdate) {
		const currentSelection = selection.value;
		const newSelection = viewUpdate.state.selection.ranges[0];

		if (!currentSelection?.eq(newSelection)) {
			selection.value = newSelection;
		}
	}

	const debouncedUpdateSegments = debounce(updateSegments, 200);

	function onEditorUpdate(viewUpdate: ViewUpdate) {
		autocompleteStatus.value = completionStatus(viewUpdate.view.state);
		updateSelection(viewUpdate);

		const shouldIgnoreUpdate = viewUpdate.transactions.some((tr) =>
			tr.annotation(ignoreUpdateAnnotation),
		);

		if (viewUpdate.docChanged && !shouldIgnoreUpdate) {
			hasChanges.value = true;
			emitChanges(viewUpdate);
			debouncedUpdateSegments();
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

		const state = EditorState.create({
			doc: toValue(editorValue),
			extensions: [
				TARGET_NODE_PARAMETER_FACET.of(
					expressionLocalResolveContext.value
						? { nodeName: expressionLocalResolveContext.value.nodeName, parameterPath: '' }
						: toValue(targetNodeParameterContext),
				),
				customExtensions.value.of(toValue(extensions)),
				readOnlyExtensions.value.of([EditorState.readOnly.of(toValue(isReadOnly))]),
				telemetryExtensions.value.of([]),
				EditorView.updateListener.of(onEditorUpdate),
				EditorView.focusChangeEffect.of((_, newHasFocus) => {
					hasFocus.value = newHasFocus;
					selection.value = state.selection.ranges[0];
					if (!newHasFocus) {
						autocompleteStatus.value = null;
						debouncedUpdateSegments();
					}
					return null;
				}),
				EditorView.contentAttributes.of({ 'data-gramm': 'false' }), // disable grammarly
				EditorView.domEventHandlers({
					mousedown: () => {
						dragging.value = true;
					},
				}),
			],
		});

		if (editor.value) {
			editor.value.destroy();
		}
		editor.value = new EditorView({ parent, state });
		debouncedUpdateSegments();
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
				effects: readOnlyExtensions.value.reconfigure([
					EditorState.readOnly.of(toValue(isReadOnly)),
				]),
			});
		}
	});

	watchEffect(() => {
		if (!editor.value) return;

		const newValue = toValue(editorValue);
		const currentValue = readEditorValue();
		if (newValue === undefined || newValue === currentValue) return;

		editor.value.dispatch({
			changes: { from: 0, to: currentValue.length, insert: newValue },
		});
	});

	watchEffect(() => {
		const telemetry = toValue(autocompleteTelemetry);
		if (!telemetry?.enabled) return;

		useAutocompleteTelemetry({
			editor,
			parameterPath: telemetry.parameterPath,
			compartment: telemetryExtensions,
		});
	});

	onMounted(() => {
		document.addEventListener('click', blurOnClickOutside);
	});

	onBeforeUnmount(() => {
		document.removeEventListener('click', blurOnClickOutside);
		debouncedUpdateSegments.flush();
		emitChanges.flush();
		editor.value?.destroy();
	});

	const expressionExtensionNames = computed<Set<string>>(() => {
		return new Set(
			ExpressionExtensions.reduce<string[]>((acc, cur) => {
				return [...acc, ...Object.keys(cur.functions)];
			}, []),
		);
	});

	function isUncalledExpressionExtension(resolvable: string) {
		const end = resolvable
			.replace(/^{{|}}$/g, '')
			.trim()
			.split('.')
			.pop();

		return end !== undefined && expressionExtensionNames.value.has(end);
	}

	function resolve(resolvable: string, target: TargetItem | null) {
		const result: { resolved: unknown; error: boolean; fullError: Error | null } = {
			resolved: undefined,
			error: false,
			fullError: null,
		};

		try {
			if (expressionLocalResolveContext.value) {
				result.resolved = workflowHelpers.resolveExpression('=' + resolvable, undefined, {
					...expressionLocalResolveContext.value,
					additionalKeys: toValue(additionalData),
				});
			} else if (!ndvStore.activeNode && toValue(targetNodeParameterContext) === undefined) {
				// e.g. credential modal
				result.resolved = Expression.resolveWithoutWorkflow(resolvable, toValue(additionalData));
			} else {
				let opts: ResolveParameterOptions = {
					additionalKeys: toValue(additionalData),
					contextNodeName: toValue(targetNodeParameterContext)?.nodeName,
				};
				if (
					toValue(targetNodeParameterContext) === undefined &&
					ndvStore.isInputParentOfActiveNode
				) {
					opts = {
						targetItem: target ?? undefined,
						inputNodeName: ndvStore.ndvInputNodeName,
						inputRunIndex: ndvStore.ndvInputRunIndex,
						inputBranchIndex: ndvStore.ndvInputBranchIndex,
					};
				}
				result.resolved = workflowHelpers.resolveExpression('=' + resolvable, undefined, opts);
			}
		} catch (error) {
			const hasRunData =
				!!workflowsStore.workflowExecutionData?.data?.resultData?.runData[
					ndvStore.activeNode?.name ?? ''
				];
			result.resolved = `[${getExpressionErrorMessage(error, hasRunData)}]`;
			result.error = true;
			result.fullError = error;
		}

		if (result.resolved === undefined) {
			result.resolved = isUncalledExpressionExtension(resolvable)
				? i18n.baseText('expressionEditor.uncalledFunction')
				: i18n.baseText('expressionModalInput.undefined');

			result.error = true;
		}

		return result;
	}

	const targetItem = computed<TargetItem | null>(() => ndvStore.expressionTargetItem);

	const resolvableSegments = computed<Resolvable[]>(() => {
		return segments.value.filter((s): s is Resolvable => s.kind === 'resolvable');
	});

	const plaintextSegments = computed<Plaintext[]>(() => {
		return segments.value.filter((s): s is Plaintext => s.kind === 'plaintext');
	});

	const htmlSegments = computed<Html[]>(() => {
		return segments.value.filter((s): s is Html => s.kind !== 'resolvable');
	});

	/**
	 * Segments to display in the output of an expression editor.
	 *
	 * Some segments are not displayed when they are _part_ of the result,
	 * but displayed when they are the _entire_ result:
	 *
	 * - `This is a {{ [] }} test` displays as `This is a test`.
	 * - `{{ [] }}` displays as `[Array: []]`.
	 *
	 * - `This is a {{ {} }} test` displays as `This is a [object Object] test`.
	 * - `{{ {} }}` displays as `[Object: {}]`.
	 *
	 * - `This is a {{ [{}] }} test` displays as `This is a [object Object] test`.
	 * - `{{ [] }}` displays as `[Array: []]`.
	 *
	 * Some segments display differently based on context:
	 *
	 * Date displays as
	 * - `Mon Nov 14 2022 17:26:13 GMT+0100 (CST)` when part of the result
	 * - `[Object: "2022-11-14T17:26:13.130Z"]` when the entire result
	 *
	 * Only needed in order to mimic behavior of `ParameterInputHint`.
	 */
	const displayableSegments = computed<Segment[]>(() => {
		const cachedSegments = segments.value;
		return cachedSegments
			.map((s) => {
				if (cachedSegments.length <= 1 || s.kind !== 'resolvable') return s;

				if (typeof s.resolved === 'string') {
					let resolved = s.resolved;

					if (/\[Object: "\d{4}-\d{2}-\d{2}T/.test(resolved)) {
						const utcDateString = resolved.replace(/(\[Object: "|\"\])/g, '');
						resolved = new Date(utcDateString).toString();
					}

					if (/\[Object:\s(\{.+\}|\{\})\]/.test(resolved)) {
						resolved = resolved.replace(/(\[Object: |\]$)/g, '');
						try {
							resolved = String(JSON.parse(resolved));
						} catch (error) {}
					}

					if (/\[Array:\s\[.+\]\]/.test(resolved)) {
						resolved = resolved.replace(/(\[Array: |\]$)/g, '');
						try {
							resolved = String(JSON.parse(resolved));
						} catch (error) {}
					}

					s.resolved = resolved;
				}

				return s;
			})
			.filter((s) => {
				if (
					cachedSegments.length > 1 &&
					s.kind === 'resolvable' &&
					typeof s.resolved === 'string' &&
					(s.resolved === '[Array: []]' ||
						s.resolved === i18n.baseText('expressionModalInput.empty'))
				) {
					return false;
				}

				return true;
			});
	});

	watch(
		[() => workflowsStore.getWorkflowExecution, () => workflowsStore.getWorkflowRunData],
		debouncedUpdateSegments,
	);

	watch(targetItem, updateSegments);

	watch(resolvableSegments, updateHighlighting);

	function setCursorPosition(pos: number | 'lastExpression' | 'end'): void {
		if (pos === 'lastExpression') {
			const END_OF_EXPRESSION = ' }}';
			const endOfLastExpression = readEditorValue().lastIndexOf(END_OF_EXPRESSION);
			pos =
				endOfLastExpression !== -1 ? endOfLastExpression : (editor.value?.state.doc.length ?? 0);
		} else if (pos === 'end') {
			pos = editor.value?.state.doc.length ?? 0;
		}
		editor.value?.dispatch({ selection: { head: pos, anchor: pos } });
	}

	function select(anchor: number, head: number | 'end' = 'end'): void {
		editor.value?.dispatch({
			selection: { anchor, head: head === 'end' ? (editor.value?.state.doc.length ?? 0) : head },
		});
	}

	const selectAll = () => select(0, 'end');

	function focus(): void {
		if (hasFocus.value) return;
		editor.value?.focus();
	}

	return {
		editor,
		hasFocus,
		selection,
		segments: {
			all: segments,
			html: htmlSegments,
			display: displayableSegments,
			plaintext: plaintextSegments,
			resolvable: resolvableSegments,
		},
		readEditorValue,
		setCursorPosition,
		select,
		selectAll,
		focus,
		hasChanges,
	};
};
