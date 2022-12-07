import Vue from 'vue';
import { hasExpressionMapping } from '@/utils';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv';
import { useWorkflowsStore } from '@/stores/workflows';
import type { Resolvable, Segment } from '@/types/expressions';

export const telemetryUtils = Vue.extend({
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
	},
	methods: {
		/**
		 * Whether the resolvable is transforming data from another node.
		 *
		 * ```
		 * $input.all().
		 * $input.first().
		 * $input.last().
		 *
		 * $json['field'].
		 * $json["field'].
		 * $json.field'.
		 *
		 * $('nodeName').all().
		 * $('nodeName').first().
		 * $('nodeName').last().
		 *
		 * $("nodeName").all().
		 * $("nodeName").first().
		 * $("nodeName").last().
		 *
		 * $node['nodeName'].all().
		 * $node['nodeName'].first().
		 * $node['nodeName'].last().
		 *
		 * $node["nodeName"].all().
		 * $node["nodeName"].first().
		 * $node["nodeName"].last().
		 * ```
		 */
		isTransformingData(resolvable: string) {
			const regex =
				/(\$input\.\w+\(\)\.|\$json(\[('|")|\.)\w+('|")]?\.|\$\(('|")\w+('|")\)\.\w+\(\)\.|\$node\[('|")\w+('|")\]\.\w+\(\)\.)/;

			return regex.test(resolvable);
		},
		createExpressionTelemetryPayload(segments: Segment[], value: string, eventSource: string) {
			const resolvableSegments = segments.filter((s): s is Resolvable => s.kind === 'resolvable');
			const errorResolvables = resolvableSegments.filter((r) => r.error);

			const exposeErrorProperties = (error: Error) => {
				return Object.getOwnPropertyNames(error).reduce<Record<string, unknown>>((acc, key) => {
					// @ts-ignore
					return (acc[key] = error[key]), acc;
				}, {});
			};

			return {
				empty_expression: value === '=' || value === '={{}}' || !value,
				workflow_id: this.workflowsStore.workflowId,
				source: eventSource,
				session_id: this.ndvStore.sessionId,
				is_transforming_data: resolvableSegments.some((r) => this.isTransformingData(r.resolvable)),
				has_parameter: value.includes('$parameter'),
				has_mapping: hasExpressionMapping(value),
				node_type: this.ndvStore.activeNode?.type ?? '',
				handlebar_count: resolvableSegments.length,
				handlebar_error_count: errorResolvables.length,
				full_errors: errorResolvables.map((errorResolvable) => {
					return errorResolvable.fullError
						? {
								...exposeErrorProperties(errorResolvable.fullError),
								stack: errorResolvable.fullError.stack,
						  }
						: null;
				}),
				short_errors: errorResolvables.map((r) => r.resolved ?? null),
			};
		},
	},
});
