import { hasExpressionMapping } from '@/utils/nodeTypesUtils';

import type { Resolvable, Segment } from '@/types/expressions';

export function createExpressionTelemetryPayload(
	segments: Segment[],
	value: string,
	workflowId: string,
	pushRef: string,
	activeNodeType: string,
	eventSource = 'ndv',
) {
	const resolvables = segments.filter((s): s is Resolvable => s.kind === 'resolvable');
	const erroringResolvables = resolvables.filter((r) => r.error);

	return {
		empty_expression: value === '=' || value === '={{}}' || !value,
		workflow_id: workflowId,
		source: eventSource,
		push_ref: pushRef,
		is_transforming_data: resolvables.some((r) => isTransformingData(r.resolvable)),
		has_parameter: value.includes('$parameter'),
		has_mapping: hasExpressionMapping(value),
		node_type: activeNodeType,
		handlebar_count: resolvables.length,
		handlebar_error_count: erroringResolvables.length,
		short_errors: erroringResolvables.map((r) => r.resolved ?? null),
		full_errors: erroringResolvables.map((erroringResolvable) => {
			if (erroringResolvable.fullError) {
				return {
					...exposeErrorProperties(erroringResolvable.fullError),
					stack: erroringResolvable.fullError.stack,
				};
			}

			return null;
		}),
	};
}

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
function isTransformingData(resolvable: string) {
	const regex =
		/(\$input\.\w+\(\)\.|\$json(\[('|")|\.)\w+('|")]?\.|\$\(('|")\w+('|")\)\.\w+\(\)\.|\$node\[('|")\w+('|")\]\.\w+\(\)\.)/;

	return regex.test(resolvable);
}

function exposeErrorProperties(error: Error) {
	return Object.getOwnPropertyNames(error).reduce<Record<string, unknown>>((acc, key) => {
		return (acc[key] = error[key as keyof Error]), acc;
	}, {});
}
