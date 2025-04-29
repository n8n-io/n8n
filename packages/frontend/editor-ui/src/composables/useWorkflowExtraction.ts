import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	buildAdjacencyList,
	parseExtractableSubgraphSelection,
	extractReferencesInNodeExpressions,
	IConnections,
} from 'n8n-workflow';
import { computed } from 'vue';

export function useWorkflowExtraction() {
	const workflowsStore = useWorkflowsStore();

	const adjacencyList = computed(() => buildAdjacencyList(workflowsStore.workflow.connections));

	// An array indicates a list of errors, preventing extraction
	function getExtractableSelection(nodeNameSet: Set<string>) {
		return parseExtractableSubgraphSelection(nodeNameSet, adjacencyList.value);
	}

	async function tryExtractNodesIntoSubworkflow(
		nodeIds: string[],
		connections: IConnections,
	): Promise<boolean> {
		console.log('a');
		const subGraphNames = nodeIds.map(workflowsStore.getNodeById).filter((x) => x !== undefined);

		const allNodeNames = workflowsStore.workflow.nodes.map((x) => x.name);
		let startNodeName = 'Start';
		while (allNodeNames.includes(startNodeName)) startNodeName += '_1';
		const { nodes, variables } = extractReferencesInNodeExpressions(
			subGraphNames,
			allNodeNames,
			startNodeName,
		);

		const x = await workflowsStore.createNewWorkflow({
			nodes,
			connections,
		});

		console.log(x);

		return false;
	}

	return {
		adjacencyList,
		getExtractableSelection,
		tryExtractNodesIntoSubworkflow,
	};
}
