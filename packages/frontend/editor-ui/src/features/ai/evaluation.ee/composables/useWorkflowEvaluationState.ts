import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE, NodeHelpers } from 'n8n-workflow';
import { computed } from 'vue';
import { getMetricCategory, type MetricSource } from '../evaluation.utils';

const BUILTIN_METRIC_DEFAULT_NAMES: Record<string, string> = {
	correctness: 'Correctness',
	helpfulness: 'Helpfulness',
	stringSimilarity: 'String similarity',
	categorization: 'Categorization',
	toolsUsed: 'Tools Used',
};

export function useWorkflowEvaluationState() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();

	const evaluationTriggerExists = computed(() => {
		return workflowDocumentStore.value.allNodes.some(
			(node) => node.type === EVALUATION_TRIGGER_NODE_TYPE,
		);
	});

	function evaluationNodeExist(operation: string) {
		return workflowDocumentStore.value.allNodes.some((node) => {
			if (node.type !== EVALUATION_NODE_TYPE) {
				return false;
			}

			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) return false;

			const nodeParameters = NodeHelpers.getNodeParameters(
				nodeType.properties,
				node.parameters,
				true,
				false,
				node,
				nodeType,
			);

			return nodeParameters?.operation === operation;
		});
	}

	const evaluationSetMetricsNodeExist = computed(() => {
		return evaluationNodeExist('setMetrics');
	});

	const evaluationSetOutputsNodeExist = computed(() => {
		return evaluationNodeExist('setOutputs');
	});

	// Per-metric category + source-node name, keyed by metric name as it
	// appears in the run output. Built-in nodes emit one key (overridable
	// via `options.metricName`); customMetrics emits one key per assignment.
	const metricSourceByKey = computed<Record<string, MetricSource>>(() => {
		const map: Record<string, MetricSource> = {};

		for (const node of workflowDocumentStore.value.allNodes) {
			if (node.type !== EVALUATION_NODE_TYPE) continue;

			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) continue;

			const resolved = NodeHelpers.getNodeParameters(
				nodeType.properties,
				node.parameters,
				true,
				false,
				node,
				nodeType,
			);
			if (resolved?.operation !== 'setMetrics') continue;

			const metricType =
				typeof resolved.metric === 'string' && resolved.metric.length > 0
					? resolved.metric
					: 'customMetrics';

			if (metricType === 'customMetrics') {
				const assignments = (
					resolved.metrics as { assignments?: Array<{ name?: string }> } | undefined
				)?.assignments;
				if (!Array.isArray(assignments)) continue;

				for (const assignment of assignments) {
					const key = assignment?.name;
					if (typeof key !== 'string' || key.length === 0) continue;
					if (map[key]) continue;
					map[key] = { category: 'custom', nodeName: node.name };
				}
			} else {
				const overriddenName = (resolved.options as { metricName?: string } | undefined)
					?.metricName;
				const key =
					typeof overriddenName === 'string' && overriddenName.length > 0
						? overriddenName
						: BUILTIN_METRIC_DEFAULT_NAMES[metricType];
				if (!key || map[key]) continue;
				map[key] = { category: getMetricCategory(metricType), nodeName: node.name };
			}
		}

		return map;
	});

	return {
		// computed
		evaluationTriggerExists,
		evaluationSetMetricsNodeExist,
		evaluationSetOutputsNodeExist,
		metricSourceByKey,
	};
}
