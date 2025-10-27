import get from 'lodash/get';
import {
	type ITriggerFunctions,
	type IDataObject,
	type IGetNodeParameterOptions,
} from 'n8n-workflow';

import { Cron } from '../Cron.node';

describe('Cron Node', () => {
	const node = new Cron();

	const createMockExecuteFunction = (nodeParameters: IDataObject) => {
		const fakeExecuteFunction = {
			getNodeParameter(
				parameterName: string,
				fallbackValue?: IDataObject,
				options?: IGetNodeParameterOptions,
			) {
				const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;

				const parameterValue = get(nodeParameters, parameter, fallbackValue);

				return parameterValue;
			},
		} as unknown as ITriggerFunctions;
		return fakeExecuteFunction;
	};

	const triggerFunctions = createMockExecuteFunction({
		triggerTimes: {
			item: [],
		},
	});

	it('should return a function to trigger', async () => {
		expect(await node.trigger.call(triggerFunctions)).toEqual({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			manualTriggerFunction: expect.any(Function),
		});
	});
});
