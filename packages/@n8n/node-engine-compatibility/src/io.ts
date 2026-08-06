import type { StepSlots } from '@n8n/engine';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { isRecord } from './guards';

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

export function toStepOutputs(outputs: INodeExecutionData[][]): StepSlots {
	return outputs as unknown as StepSlots;
}
