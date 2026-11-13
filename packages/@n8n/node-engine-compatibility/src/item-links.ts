import type { StepInputSource, StepInputSources } from '@n8n/engine';
import type { INodeExecutionData, IPairedItemData, ISourceData } from 'n8n-workflow';

/**
 * Where an input item came from, in v1 terms.
 *
 * A v1 input slot records one source node. Engine v2 can feed one slot from
 * several edges, concatenated, so an item from any other edge carries its own
 * source as `pairedItem.sourceOverwrite`, which the data proxy reads before
 * the slot's source. `item` is then the index within that source's output,
 * not the position in the slot.
 */
export interface ItemLink {
	item: number;
	sourceOverwrite?: ISourceData;
}

/** Per input slot, one link per item position. */
export type ItemLinks = ItemLink[][];

/**
 * The link of every input item, from the rows the engine says fed each slot.
 *
 * `slotSources` is what v1 records for the node's slots, which the shim takes
 * from the first graph edge into each slot. Items from that source keep a plain
 * link. Items from any other row get `sourceOverwrite`, with the pass only when
 * it is not the first, as `toSourceSlots` does.
 */
export function itemLinks(
	inputSources: StepInputSources,
	slotSources: Array<ISourceData | null>,
	namesById: Map<string, string>,
): ItemLinks {
	return inputSources.map((sources, slot) => {
		const slotSource = slotSources[slot] ?? null;
		const links: ItemLink[] = [];

		for (const source of sources) {
			const sourceData = toSourceData(source, namesById);
			const isSlotSource =
				slotSource !== null &&
				slotSource.previousNode === sourceData.previousNode &&
				slotSource.previousNodeOutput === sourceData.previousNodeOutput;

			for (let item = 0; item < source.itemCount; item++) {
				links.push(isSlotSource ? { item: links.length } : { item, sourceOverwrite: sourceData });
			}
		}

		return links;
	});
}

function toSourceData(source: StepInputSource, namesById: Map<string, string>): ISourceData {
	return {
		previousNode: namesById.get(source.nodeId) ?? source.nodeId,
		previousNodeOutput: source.outputIndex,
		// v1 reads a missing value as 0, so only a later pass is reported.
		...(source.iteration === 0 ? {} : { previousNodeRun: source.iteration }),
	};
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
