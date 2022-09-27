import { INodeExecutionData, IPairedItemData, IRunData, ITaskData } from "n8n-workflow";
import { IExecutionResponse } from "./Interface";

export function getPairedItemId(node: string, run: number, output: number, item: number): string {
	return `${node}_r${run}_o${output}_i${item}`;
}

function addPairing(paths: {[item: string]: string[][]}, pairedItemId: string, pairedItem: IPairedItemData, sources: ITaskData['source'], executionData: INodeExecutionData, runData: IRunData) {
	paths[pairedItemId] = paths[pairedItemId] || [];

	const input = pairedItem.input || 0;
	const sourceNode = sources[input]?.previousNode;
	if (!sourceNode) { // trigger nodes for example
		paths[pairedItemId].push([pairedItemId]);
		return;
	}
	const sourceNodeOutput = sources[input]?.previousNodeOutput || 0;
	const sourceNodeRun = sources[input]?.previousNodeRun || 0;

	const sourceItem = getPairedItemId(sourceNode, sourceNodeRun, sourceNodeOutput, pairedItem.item);
	paths?.[sourceItem]?.forEach((path) => {
		paths?.[pairedItemId]?.push([...path, pairedItemId]);
	});
}

function addPairedItemIdsRec(node: string, runIndex: number, runData: IRunData, seen: Set<string>, paths: {[item: string]: string[][]}) {
	const key = `${node}_r${runIndex}`;
	if (seen.has(key)) {
		return;
	}
	seen.add(key);

	const nodeRunData = runData[node];
	if (!Array.isArray(nodeRunData)) {
		return;
	}

	const data = nodeRunData[runIndex];
	if (!data?.data?.main) {
		return;
	}

	const sources = data.source || [];
	sources.forEach((source) => {
		if (source?.previousNode) {
			addPairedItemIdsRec(source.previousNode, source.previousNodeRun ?? 0, runData, seen, paths);
		}
	});

	const mainData = data.data.main || [];
	mainData.forEach((outputData, output: number) => {
		if (!outputData) {
			return;
		}

		outputData.forEach((executionData, item: number) => {
			const pairedItemId = getPairedItemId(node, runIndex, output, item);
			if (!executionData.pairedItem) {
				paths[pairedItemId] = [];
				return;
			}

			const pairedItem = executionData.pairedItem;
			if (Array.isArray(pairedItem)) {
				pairedItem.forEach((item) => {
					addPairing(paths, pairedItemId, item, sources, executionData, runData);
				});
				return;
			}

			if (typeof pairedItem === 'object') {
				addPairing(paths, pairedItemId, pairedItem, sources, executionData, runData);
				return;
			}

			addPairing(paths, pairedItemId, {item: pairedItem}, sources, executionData, runData);
		});
	});
}

function getMapping(paths: {[item: string]: string[][]}): {[item: string]: Set<string>} {
	const mapping: {[itemId: string]: Set<string>} = {};

	Object.keys(paths).forEach((item) => {
		paths?.[item]?.forEach((path) => {
			path.forEach((otherItem) => {
				if (otherItem !== item) {
					mapping[otherItem] = mapping[otherItem] || new Set();
					mapping[otherItem].add(item);

					mapping[item] = mapping[item] || new Set();
					mapping[item].add(otherItem);
				}
			});
		});
	});

	return mapping;
}

export function getPairedItemsMapping(executionResponse: IExecutionResponse | null): {[itemId: string]: Set<string>} {
	if (!executionResponse?.data?.resultData?.runData) {
		return {};
	}

	const seen = new Set<string>();
	const runData = executionResponse.data.resultData.runData;

	const paths: {[item: string]: string[][]} = {};
	Object.keys(runData).forEach((node) => {
		runData[node].forEach((_, runIndex) => {
			addPairedItemIdsRec(node, runIndex, runData, seen, paths);
		});
	});

	return getMapping(paths);
}
