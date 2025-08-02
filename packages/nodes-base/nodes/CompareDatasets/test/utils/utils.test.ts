import type { INodeExecutionData } from 'n8n-workflow';

import { checkInput } from '../../GenericFunctions';

describe('Test Compare Datasets Node utils', () => {
	it('test checkInput', () => {
		const input1 = [
			{ json: {} },
			{
				json: {
					name: 'Test',
					age: 30,
				},
			},
			{
				json: {
					name: 'Test2',
					age: 30,
				},
			},
		];

		expect(checkInput(input1).length).toEqual(2);

		const input2: INodeExecutionData[] = [{ json: {} }];

		expect(checkInput(input2).length).toEqual(0);

		const input3 = undefined;

		expect(checkInput(input3 as unknown as INodeExecutionData[]).length).toEqual(0);
	});
});
