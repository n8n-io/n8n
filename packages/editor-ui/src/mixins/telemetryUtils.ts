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
		 * Whether the resolvable is transforming data from another node,
		 * i.e. operating on `$input()`, `$json`, `$()` or `$node[]`.
		 *
		 * ```
		 * $input.all().
		 * $input.first().
		 * $input.last().
		 *
		 * $json['field'].
		 * $json["field"].
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
		exposeErrorProperties(error: Error) {
			return Object.getOwnPropertyNames(error).reduce<Record<string, unknown>>((acc, key) => {
				return acc[key] = error[key as keyof Error], acc;
			}, {});
		},
		createExpressionTelemetryPayload(segments: Segment[], value: string, eventSource = 'ndv') {
			const resolvables = segments.filter((s): s is Resolvable => s.kind === 'resolvable');
			const erroringResolvables = resolvables.filter((r) => r.error);

			return {
				empty_expression: value === '=' || value === '={{}}' || !value,
				workflow_id: this.workflowsStore.workflowId,
				source: eventSource,
				session_id: this.ndvStore.sessionId,
				is_transforming_data: resolvables.some((r) => this.isTransformingData(r.resolvable)),
				has_parameter: value.includes('$parameter'),
				has_mapping: hasExpressionMapping(value),
				node_type: this.ndvStore.activeNode?.type ?? '',
				handlebar_count: resolvables.length,
				handlebar_error_count: erroringResolvables.length,
				short_errors: erroringResolvables.map((r) => r.resolved ?? null),
				full_errors: erroringResolvables.map((errorResolvable) => {
					return errorResolvable.fullError
						? {
								...this.exposeErrorProperties(errorResolvable.fullError),
								stack: errorResolvable.fullError.stack,
							}
						: null;
				}),
			};
		},
	},
});
