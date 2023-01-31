import { IPairedItemData, IRunData, ITaskData } from 'n8n-workflow';
import { IExecutionResponse, TargetItem } from '../Interface';
import { isNotNull } from '@/utils';

/*
	Utility functions that provide shared functionalities used to add paired item support to nodes
*/

export function getPairedItemId(node: string, run: number, output: number, item: number): string {
	return `${node}_r${run}_o${output}_i${item}`;
}

export function getSourceItems(data: IExecutionResponse, target: TargetItem): TargetItem[] {
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
	if (!item || item.pairedItem === undefined) {
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

function getMapping(paths: { [item: string]: string[][] }): { [item: string]: Set<string> } {
	const mapping: { [itemId: string]: Set<string> } = {};

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

export function getPairedItemsMapping(executionResponse: IExecutionResponse | null): {
	[itemId: string]: Set<string>;
} {
	if (!executionResponse?.data?.resultData?.runData) {
		return {};
	}

	const seen = new Set<string>();
	const runData = executionResponse.data.resultData.runData;

	const pinned = new Set(Object.keys(executionResponse.data.resultData.pinData || {}));

	const paths: { [item: string]: string[][] } = {};
	Object.keys(runData).forEach((node) => {
		runData[node].forEach((_, runIndex: number) => {
			addPairedItemIdsRec(node, runIndex, runData, seen, paths, pinned);
		});
	});

	return getMapping(paths);
}
