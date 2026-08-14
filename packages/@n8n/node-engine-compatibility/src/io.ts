import type { StepSlots } from '@n8n/engine';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { isRecord } from './guards';

export function fromStepInputs(value: StepSlots): INodeExecutionData[][] {
	return value.map((items) => {
		// a bare object in a slot is a single item: the shape of a trigger
		// payload, until proper trigger handling decides its shape
		if (isRecord(items)) return [{ json: items as IDataObject }];
		if (!Array.isArray(items)) return [];
		return items.map((item): INodeExecutionData => {
			if (isRecord(item) && isRecord(item.json)) return item as unknown as INodeExecutionData;
			if (isRecord(item)) return { json: item as IDataObject };
			return { json: { value: item } as IDataObject };
		});
	});
}

export function toStepOutputs(outputs: INodeExecutionData[][]): StepSlots {
	// v1 marks a branch "not taken" by producing zero items; the engine marks it
	// with a null slot (dead edge), which is what makes skip propagation see the
	// branch as dead. The collapse is v1 policy applied at the boundary — []
	// stays representable inside the engine.
	return outputs.map((slot) => (slot.length === 0 ? null : slot)) as unknown as StepSlots;
}
