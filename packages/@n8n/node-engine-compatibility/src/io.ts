import type { JsonValue, StepSlots } from '@n8n/engine';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { isRecord } from './guards';

/** Slot-indexed inputs to v1's `INodeExecutionData[][]`, which is also slot-indexed. */
export function fromStepInputs(value: StepSlots): INodeExecutionData[][] {
	return value.map((items) => {
		// a slot the engine reports as not taken carries no items
		if (!Array.isArray(items)) return [];
		return items.map((item): INodeExecutionData => {
			if (isRecord(item) && isRecord(item.json)) return item as unknown as INodeExecutionData;
			if (isRecord(item)) return { json: item as IDataObject };
			return { json: { value: item } as IDataObject };
		});
	});
}

/**
 * v1's `INodeExecutionData[][]` to slot-indexed outputs.
 *
 * An empty slot becomes `null`, because v1 treats "produced no items" as "branch
 * not taken" and stops there. `alwaysOutputData` is how a v1 node opts out: it
 * substitutes a single empty item, so the slot is no longer empty by the time it
 * reaches here. `Array.from` rather than `map`, to visit the holes a node leaves
 * when it fills only some of its slots.
 */
export function toStepOutputs(outputs: INodeExecutionData[][]): StepSlots {
	return Array.from(outputs, (slot) => (slot?.length ? (slot as unknown as JsonValue) : null));
}
