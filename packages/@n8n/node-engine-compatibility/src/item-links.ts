import type { StepInputSources, WorkflowGraph } from '@n8n/engine';
import type { INodeExecutionData, IPairedItemData } from 'n8n-workflow';

import { sourceLinks } from './v1-run-data';

/** Per input slot, one link per item position; empty for a slot that one edge feeds. */
export type ItemLinks = Array<Array<IPairedItemData | undefined>>;

/** The input slots of `nodeId` that more than one edge feeds. */
export function convergingSlots(graph: WorkflowGraph, nodeId: string): Set<number> {
	const fed = new Set<number>();
	const converging = new Set<number>();
	for (const edge of graph.edges) {
		if (edge.to !== nodeId) continue;
		if (fed.has(edge.inputIndex)) converging.add(edge.inputIndex);
		fed.add(edge.inputIndex);
	}
	return converging;
}

/**
 * Links for the items of each slot that several edges feed, from the sources
 * the engine reports. v1 records one source per input slot: the first edge into
 * it. So each such item names its own source as `pairedItem.sourceOverwrite`,
 * which the data proxy reads before the slot's source.
 */
export function itemLinks(
	inputSources: StepInputSources,
	converging: ReadonlySet<number>,
	namesById: Map<string, string>,
): ItemLinks {
	return inputSources.map((sources, slot) =>
		converging.has(slot) ? sourceLinks(sources, namesById) : [],
	);
}

/**
 * Stamps every input item with its link, as v1 does before it runs a node
 * (`WorkflowExecute.addPairedItemLineage`). An item keeps the link its
 * producer gave it, which points into the producer's input. A node that passes
 * items through, like If, keeps a link that is already set, so without this
 * the link would skip a node and name the wrong item.
 *
 * v1 also keeps a tool call's `sourceOverwrite`. Engine v2 runs no tool calls:
 * the converter rejects every connection that is not `main`.
 */
export function linkInputItems(
	itemsByConnection: INodeExecutionData[][],
	links: ItemLinks,
): INodeExecutionData[][] {
	return itemsByConnection.map((items, inputIndex) =>
		items.map((item, itemIndex) => ({
			...item,
			pairedItem: {
				...(links[inputIndex]?.[itemIndex] ?? { item: itemIndex }),
				...(inputIndex === 0 ? {} : { input: inputIndex }),
			},
		})),
	);
}

/**
 * Points an output item's link at the row that fed the input item it names.
 *
 * A node links its outputs to positions in its input. The data proxy walks a
 * stored output's link straight to the slot's source, so a link into an item
 * from another edge has to carry that edge's source itself. A link that already
 * names a source is left alone: it came through from a stamped input.
 */
export function relinkOutputItems(
	outputs: INodeExecutionData[][],
	links: ItemLinks,
): INodeExecutionData[][] {
	return outputs.map((items) => {
		// A node may leave an output slot null; the type says otherwise.
		if (!Array.isArray(items)) return items;
		return items.map((item) => {
			const { pairedItem } = item;
			if (pairedItem === undefined) return item;
			if (typeof pairedItem === 'number') {
				const relinked = relinkOne({ item: pairedItem }, links);
				return relinked === undefined ? item : { ...item, pairedItem: relinked };
			}
			return {
				...item,
				pairedItem: Array.isArray(pairedItem)
					? pairedItem.map((link) => relinkOne(link, links) ?? link)
					: (relinkOne(pairedItem, links) ?? pairedItem),
			};
		});
	});
}

/** The link with its source, or `undefined` when it stays as it is. */
function relinkOne(link: IPairedItemData, links: ItemLinks): IPairedItemData | undefined {
	if (link.sourceOverwrite !== undefined) return undefined;

	const inputLink = links[link.input ?? 0]?.[link.item];
	if (inputLink?.sourceOverwrite === undefined) return undefined;

	return { ...link, item: inputLink.item, sourceOverwrite: inputLink.sourceOverwrite };
}
