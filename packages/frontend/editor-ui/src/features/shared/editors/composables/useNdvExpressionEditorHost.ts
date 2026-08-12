import { computed, inject, ref, toValue, watchEffect, type MaybeRefOrGetter } from 'vue';
import type { IDataObject } from 'n8n-workflow';
import { Compartment, type Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import type { TargetNodeParameterContext } from '@/Interface';
import { useAutocompleteTelemetry } from '@/app/composables/useAutocompleteTelemetry';
import {
	TARGET_NODE_PARAMETER_FACET,
	WORKFLOW_DOCUMENT_FACET,
} from '../plugins/codemirror/completions/constants';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNdvExpressionResolver } from './useNdvExpressionResolver';

/**
 * Everything the shared expression editor needs to behave like the NDV's:
 * workflow-scoped resolution, the facets the completion sources read, and the
 * autocomplete telemetry compartment.
 */
export function useNdvExpressionEditorHost({
	targetNodeParameterContext,
	additionalData,
	autocompleteTelemetry,
}: {
	targetNodeParameterContext?: MaybeRefOrGetter<TargetNodeParameterContext>;
	additionalData?: MaybeRefOrGetter<IDataObject>;
	autocompleteTelemetry?: MaybeRefOrGetter<{ enabled: true; parameterPath: string }>;
} = {}) {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const expressionLocalResolveContext = inject(
		ExpressionLocalResolveContextSymbol,
		computed(() => undefined),
	);
	const telemetryCompartment = ref<Compartment>(new Compartment());

	const resolver = useNdvExpressionResolver({ targetNodeParameterContext, additionalData });

	// Read once, when the view is built: the facets are not meant to follow the
	// store, and the telemetry compartment must outlive extension reconfigures.
	const staticExtensions = (): Extension[] => [
		TARGET_NODE_PARAMETER_FACET.of(
			expressionLocalResolveContext.value
				? { nodeName: expressionLocalResolveContext.value.nodeName, parameterPath: '' }
				: toValue(targetNodeParameterContext),
		),
		WORKFLOW_DOCUMENT_FACET.of(workflowDocumentStore.value.documentId),
		telemetryCompartment.value.of([]),
	];

	function trackAutocomplete(editor: MaybeRefOrGetter<EditorView | undefined>) {
		watchEffect(() => {
			const telemetry = toValue(autocompleteTelemetry);
			if (!telemetry?.enabled) return;

			useAutocompleteTelemetry({
				editor,
				parameterPath: telemetry.parameterPath,
				compartment: telemetryCompartment,
			});
		});
	}

	return { resolver, staticExtensions, trackAutocomplete };
}
