import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

export const node: INode = {
	id: '11',
	name: 'Airtable node',
	typeVersion: 2,
	type: 'n8n-nodes-base.airtable',
	position: [42, 42],
	parameters: {
		operation: 'create',
	},
};

export const createMockExecuteFunction = (nodeParameters: IDataObject) => {
	const fakeExecuteFunction = {
		getInputData: jest.fn(() => {
			return [{ json: {} }];
		}),
		getNodeParameter: jest.fn(
			(
				parameterName: string,
				_itemIndex: number,
				fallbackValue?: IDataObject,
				options?: IGetNodeParameterOptions,
			) => {
				const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
				return get(nodeParameters, parameter, fallbackValue);
			},
		),
		getNode: jest.fn(() => {
			return node;
		}),
		helpers: { constructExecutionMetaData: jest.fn(constructExecutionMetaData) },
		continueOnFail: jest.fn(() => false),
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};
