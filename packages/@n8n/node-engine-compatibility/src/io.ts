import type { StepSlots } from '@n8n/engine';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { isRecord } from './guards';

/**
 * Slot-indexed inputs to v1's `INodeExecutionData[][]`, which is also indexed
 * by input connection on its outer axis. A slot that carries no items — `null`
 * (nothing arrived) or non-item content like the raw trigger payload —
 * contributes an empty item list, matching v1's coercion of never-received
 * inputs.
 */
export function fromStepInputs(value: StepSlots): INodeExecutionData[][] {
	return value.map((items) => {
		if (!Array.isArray(items)) return [];
		return items.map((item): INodeExecutionData => {
			if (isRecord(item) && isRecord(item.json)) return item as unknown as INodeExecutionData;
			if (isRecord(item)) return { json: item as IDataObject };
			return { json: { value: item } as IDataObject };
		});
	});
}

/**
 * v1's `INodeExecutionData[][]` to slot-indexed outputs — structurally the
 * same shape, so this is a pure retype. An empty slot stays `[]`: "produced no
 * items" and "branch not taken" only become distinct once branching lands
 * (CAT-2874), and the collapse belongs there.
 */
export function toStepOutputs(outputs: INodeExecutionData[][]): StepSlots {
	return outputs as unknown as StepSlots;
}
