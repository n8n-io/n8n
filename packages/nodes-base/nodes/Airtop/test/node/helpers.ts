import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';

export const node: INode = {
	id: '1',
	name: 'Airtop node',
	typeVersion: 1,
	type: 'n8n-nodes-base.airtop',
	position: [10, 10],
	parameters: {},
};

export const createMockExecuteFunction = (nodeParameters: IDataObject) => {
	const fakeExecuteFunction = {
		getInputData(): INodeExecutionData[] {
			return [{ json: {} }];
		},
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			return node;
		},
		helpers: {
			constructExecutionMetaData,
			returnJsonArray: (data: IDataObject | IDataObject[]) => {
				return [{ json: data }] as INodeExecutionData[];
			},
			prepareBinaryData: async (data: Buffer) => {
				return {
					mimeType: 'image/jpeg',
					fileType: 'jpg',
					fileName: 'screenshot.jpg',
					data: data.toString('base64'),
				};
			},
		},
		continueOnFail: () => false,
		logger: {
			info: () => {},
		},
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};
