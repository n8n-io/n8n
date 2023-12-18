import type { IPairedItemData, IRunData, ITaskData } from 'n8n-workflow';
import type { IExecutionResponse, TargetItem } from '@/Interface';
import { isNotNull } from '@/utils/typeGuards';
// import { sia, desia } from "sializer"
// import pako from "pako"
/*
	Utility functions that provide shared functionalities used to add paired item support to nodes
*/

function getPairedItemId(node: string, run: number, output: number, item: number): string {
	return `${node}_r${run}_o${output}_i${item}`;
}

function getSourceItems(data: IExecutionResponse, target: TargetItem): TargetItem[] {
	if (!data?.data?.resultData?.runData) {
		return [];
	}

	const runData = data.data.resultData.runData;
	const taskData: ITaskData | undefined = runData[target.nodeName]?.[target.runIndex];
	const source = taskData?.source || [];
	if (source.length === 0) {
		return [];
	}

	const item = taskData?.data?.main?.[target.outputIndex]?.[target.itemIndex];
	if (item?.pairedItem === undefined) {
		return [];
	}

	const pairedItem: IPairedItemData[] = Array.isArray(item.pairedItem)
		? item.pairedItem
		: typeof item.pairedItem === 'object'
		  ? [item.pairedItem]
		  : [{ item: item.pairedItem }];
	const sourceItems = pairedItem.map((item) => {
		const input = item.input || 0;
		return {
			nodeName: source?.[input]?.previousNode,
			runIndex: source?.[input]?.previousNodeRun || 0,
			itemIndex: item.item,
			outputIndex: source[input]?.previousNodeOutput || 0,
		};
	});

	return sourceItems.filter((item): item is TargetItem => isNotNull(item));
}

function addPairing(
	paths: { [item: string]: string[][] },
	pairedItemId: string,
	pairedItem: IPairedItemData,
	sources: ITaskData['source'],
) {
	paths[pairedItemId] = paths[pairedItemId] || [];

	const input = pairedItem.input || 0;
	const sourceNode = sources[input]?.previousNode;
	if (!sourceNode) {
		// trigger nodes for example
		paths[pairedItemId].push([pairedItemId]);
		return;
	}
	const sourceNodeOutput = sources[input]?.previousNodeOutput || 0;
	const sourceNodeRun = sources[input]?.previousNodeRun || 0;

	const sourceItem = getPairedItemId(sourceNode, sourceNodeRun, sourceNodeOutput, pairedItem.item);
	if (!paths[sourceItem]) {
		paths[sourceItem] = [[sourceItem]]; // pinned data case
	}
	paths[sourceItem]?.forEach((path) => {
		paths?.[pairedItemId]?.push([...path, pairedItemId]);
	});
}

function addPairedItemIdsRec(
	node: string,
	runIndex: number,
	runData: IRunData,
	seen: Set<string>,
	paths: { [item: string]: string[][] },
	pinned: Set<string>,
) {
	const key = `${node}_r${runIndex}`;
	if (seen.has(key)) {
		return;
	}
	seen.add(key);

	if (pinned.has(node)) {
		return;
	}

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
			addPairedItemIdsRec(
				source.previousNode,
				source.previousNodeRun ?? 0,
				runData,
				seen,
				paths,
				pinned,
			);
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
					addPairing(paths, pairedItemId, item, sources);
				});
				return;
			}

			if (typeof pairedItem === 'object') {
				addPairing(paths, pairedItemId, pairedItem, sources);
				return;
			}

			addPairing(paths, pairedItemId, { item: pairedItem }, sources);
		});
	});
}

// function getMapping(paths: { [item: string]: string[][] }): { [item: string]: Set<string> } {
// 	const mapping: { [itemId: string]: Set<string> } = {};

// 	Object.keys(paths).forEach((item) => {
// 		paths?.[item]?.forEach((path) => {
// 			path.forEach((otherItem) => {
// 				if (otherItem !== item) {
// 					mapping[otherItem] = mapping[otherItem] || new Set();
// 					mapping[otherItem].add(item);

// 					mapping[item] = mapping[item] || new Set();
// 					mapping[item].add(otherItem);
// 				}
// 			});
// 		});
// 	});

// 	return mapping;
// }
function getMapping(paths: { [item: string]: string[][] }, batchKeys: string[]): { [item: string]: Set<string> } {
	const mapping: { [itemId: string]: Set<string> } = {};

	batchKeys.forEach((item) => {
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

function getPairedItemsMapping(executionResponse: IExecutionResponse | null): { [itemId: string]: Set<string> } {
	if (!executionResponse?.data?.resultData?.runData) {
		return {};
	}

	const paths: { [item: string]: string[][] } = {};
	const batchSize = 100; // Example batch size
	const pathsKeys = Object.keys(paths);
	console.log("🚀 ~ file: pairedItem.worker.ts:196 ~ getPairedItemsMapping ~ pathsKeys:", pathsKeys)
	const batches = Math.ceil(pathsKeys.length / batchSize);
	const finalMapping: { [itemId: string]: Set<string> } = {};

	for (let i = 0; i < batches; i++) {
			const batchStart = i * batchSize;
			const batchEnd = batchStart + batchSize;
			const batchKeys = pathsKeys.slice(batchStart, batchEnd);

			const batchMapping = getMapping(paths, batchKeys);

			// Merge batchMapping into finalMapping
			Object.keys(batchMapping).forEach(key => {
					if (!finalMapping[key]) {
							finalMapping[key] = new Set();
					}
					batchMapping[key].forEach(item => finalMapping[key].add(item));
			});
	}

	return finalMapping;
}

onmessage = (event) => {
	if(!event.data) {
		return;
	}

	if(event.data.action === 'getPairedItemsMapping' && event.data.executionResponse) {
		try {
			const startTime = performance.now();

			const decoder = new TextDecoder();
			const jsonString = decoder.decode(event.data.executionResponse);
			const endDecode = performance.now();
			console.log("Decoding took", endDecode - startTime, "ms");
			const originalObject = JSON.parse(jsonString);
			const endParse = performance.now();
			console.log("Parsing took", endParse - endDecode, "ms");
			const mapping = getPairedItemsMapping(originalObject);
			const endMapping = performance.now();
			console.log("Mapping took", endMapping - endParse, "ms");
			postMessage(mapping);
		} catch (error) {
			console.error("Could not parse execution response", error);
		}
		return;
	}

	if(event.data.action === 'getSourceItems') {
		postMessage(getSourceItems(event.data.executionResponse, event.data.target));
		return;
	}
	postMessage('Unknown action');
};
