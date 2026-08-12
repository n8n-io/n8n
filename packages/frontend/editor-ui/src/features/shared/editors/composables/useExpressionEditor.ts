import type { MaybeRefOrGetter } from 'vue';

import type { IDataObject } from 'n8n-workflow';
import type { Extension } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { useExpressionEditor as useBaseExpressionEditor } from '@n8n/expression-editor';

import type { TargetNodeParameterContext } from '@/Interface';
import { closeCursorInfoBox } from '../plugins/codemirror/tooltips/InfoBoxTooltip';
import { useNdvExpressionEditorHost } from './useNdvExpressionEditorHost';

/**
 * The workflow editor's expression input: the shared editor wired to NDV
 * resolution, the workflow-scoped completion facets and autocomplete telemetry.
 */
export const useExpressionEditor = ({
	editorRef,
	editorValue,
	targetNodeParameterContext,
	extensions = [],
	additionalData = {},
	skipSegments = [],
	autocompleteTelemetry,
	isReadOnly = false,
	disableSearchDialog = false,
	initialCursorPosition,
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
	disableSearchDialog?: MaybeRefOrGetter<boolean>;
	initialCursorPosition?: number | 'lastExpression' | 'end';
	onChange?: (viewUpdate: ViewUpdate) => void;
}) => {
	const { resolver, staticExtensions, trackAutocomplete } = useNdvExpressionEditorHost({
		targetNodeParameterContext,
		additionalData,
		autocompleteTelemetry,
	});

	const editorApi = useBaseExpressionEditor({
		editorRef,
		editorValue,
		resolver,
		extensions,
		staticExtensions,
		skipSegments,
		isReadOnly,
		disableSearchDialog,
		initialCursorPosition,
		onBlur: closeCursorInfoBox,
		onChange,
	});

	trackAutocomplete(editorApi.editor);

	return editorApi;
};
