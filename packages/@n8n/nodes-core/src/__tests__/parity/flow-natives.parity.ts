import { validate } from '@n8n/node-sdk';
import { ManualTrigger } from 'n8n-nodes-base/dist/nodes/ManualTrigger/ManualTrigger.node';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { manualTrigger } from '../../nodes/manual/actions/trigger';

describe('flow native contracts against the legacy nodes', () => {
	it('name the legacy node type and version', () => {
		expect(manualTrigger.native).toEqual({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			on: 'manual',
		});
		const manual = new ManualTrigger().description;
		expect([manual.name, manual.version]).toEqual(['manualTrigger', 1]);
	});

	it('type the item the Manual Trigger node emits', async () => {
		const emitted: INodeExecutionData[][][] = [];
		const context = {
			emit: (data: INodeExecutionData[][]) => emitted.push(data),
			helpers: { returnJsonArray: (items: IDataObject[]) => items.map((json) => ({ json })) },
		};
		const { manualTriggerFunction } = await new ManualTrigger().trigger.call(context as never);
		await manualTriggerFunction?.();
		expect(emitted).toEqual([[[{ json: {} }]]]);
		expect(validate({}, manualTrigger.output.json)).toEqual([]);
		expect(validate({}, manualTrigger.inputSchema)).toEqual([]);
	});
});
