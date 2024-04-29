/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	ExecutionError,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, jsonParse } from 'n8n-workflow';

import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

import { DynamicTool } from '@langchain/core/tools';

import { type ToolParameter, configureHttpRequestFunction, prettifyToolName } from './utils';

import { authenticationProperties, parametersCollection } from './descriptions';

export class ToolHttpRequest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTTP Request Tool',
		name: 'toolHttpRequest',
		icon: 'file:httprequest.svg',
		group: ['output'],
		version: 1,
		description: 'Makes an HTTP request and returns the response data',
		subtitle: `={{(${prettifyToolName})($parameter.name)}}`,
		defaults: {
			name: 'HTTP Request',
		},
		credentials: [],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolhttprequest/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. get_current_weather',
				validateType: 'string-alphanumeric',
				description:
					'The name of the function to be called, could contain letters, numbers, and underscores only',
			},
			{
				displayName: 'Description',
				name: 'toolDescription',
				type: 'string',
				placeholder: 'e.g. Get the current weather in the requested city',
				default: '',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'POST',
						value: 'POST',
					},
					{
						name: 'PUT',
						value: 'PUT',
					},
					{
						name: 'PATCH',
						value: 'PATCH',
					},
				],
				default: 'GET',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://wikipedia.org/api',
				validateType: 'url',
			},
			...authenticationProperties,
			{
				displayName: 'Define Path Parameters',
				name: 'sendInPath',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the llm should provide path parameters',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. /weather/{latitude}/{longitude}',
				hint: "Use {parameter_name} to indicate where the parameter's value should be inserted",
				displayOptions: {
					show: {
						sendInPath: [true],
					},
				},
			},
			{
				...parametersCollection,
				displayName: 'Path Parameters',
				name: 'pathParameters',
				displayOptions: {
					show: {
						sendInPath: [true],
					},
				},
			},
			{
				displayName: 'Define Query Parameters',
				name: 'sendInQuery',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the llm should provide query parameters',
			},
			{
				...parametersCollection,
				displayName: 'Query Parameters',
				name: 'queryParameters',
				displayOptions: {
					show: {
						sendInQuery: [true],
					},
				},
			},
			{
				displayName: 'Define Body Parameters',
				name: 'sendInBody',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the llm should provide body parameters',
			},
			{
				...parametersCollection,
				displayName: 'Body Parameters',
				name: 'bodyParameters',
				displayOptions: {
					show: {
						sendInBody: [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Headers',
						name: 'headers',
						type: 'json',
						typeOptions: {
							rows: 2,
						},
						default: '{\n  "Authorization": "Bearer my_token"\n}\n',
						validateType: 'object',
					},
					{
						displayName: 'Extra Body Parameters',
						name: 'bodyParameters',
						type: 'json',
						typeOptions: {
							rows: 2,
						},
						default: '{\n  "id": "some id"\n}\n',
						validateType: 'object',
					},
					{
						displayName: 'Extra Query Parameters',
						name: 'queryParameters',
						type: 'json',
						typeOptions: {
							rows: 2,
						},
						default: '{\n  "limit": 20\n}\n',
						validateType: 'object',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		// const node = this.getNode();
		// const workflowMode = this.getMode();

		const name = this.getNodeParameter('name', itemIndex) as string;
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const method = this.getNodeParameter('method', itemIndex, 'GET') as IHttpRequestMethods;
		const url = this.getNodeParameter('url', itemIndex) as string;
		const authentication = this.getNodeParameter('authentication', itemIndex, 'none') as
			| 'predefinedCredentialType'
			| 'genericCredentialType'
			| 'none';
		const options = this.getNodeParameter('options', itemIndex, {});

		let headers = (options?.headers as IDataObject) ?? {};
		let body = (options?.bodyParameters as IDataObject) ?? {};
		let qs = (options?.queryParameters as IDataObject) ?? {};

		if (typeof headers === 'string') {
			headers = jsonParse<IDataObject>(headers, {
				errorMessage: 'Invalid JSON in "Extra Request Options -> Headers" field',
			});
		}

		if (typeof body === 'string') {
			body = jsonParse<IDataObject>(body, {
				errorMessage: 'Invalid JSON in "Extra Request Options -> Body Parameters" field',
			});
		}

		if (typeof qs === 'string') {
			qs = jsonParse<IDataObject>(qs, {
				errorMessage: 'Invalid JSON in "Extra Request Options -> Query Parameters" field',
			});
		}

		const httpRequestFunction = await configureHttpRequestFunction(this, authentication, itemIndex);

		let path = this.getNodeParameter('path', itemIndex, '') as string;
		if (path && path[0] !== '/') {
			path = '/' + path;
		}
		const pathParameters = this.getNodeParameter(
			'pathParameters.values',
			itemIndex,
			[],
		) as ToolParameter[];
		const queryParameters = this.getNodeParameter(
			'queryParameters.values',
			itemIndex,
			[],
		) as ToolParameter[];
		const bodyParameters = this.getNodeParameter(
			'bodyParameters.values',
			itemIndex,
			[],
		) as ToolParameter[];

		if (pathParameters.length) {
			for (const parameter of pathParameters) {
				if (path.indexOf(`{${parameter.name}}`) === -1) {
					throw new NodeOperationError(
						this.getNode(),
						`'Path' does not contain parameter '${parameter.name}', remove it from 'Path Parameters' or include in 'Path' as {${parameter.name}}`,
					);
				}
			}
		}

		const parameters = [...pathParameters, ...queryParameters, ...bodyParameters];

		let description = toolDescription;
		if (parameters.length) {
			description +=
				` extract from prompt ${parameters.map((parameter) => `${parameter.name}(description: ${parameter.description}, type: ${parameter.type === 'any' ? 'infer from description' : parameter.type})`).join(', ')}` +
				'send as JSON';
		}

		return {
			response: new DynamicTool({
				name,
				description,
				func: async (query: string): Promise<string> => {
					const { index } = this.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);

					let response: string = '';
					let executionError: Error | undefined = undefined;
					try {
						let toolParameters: IDataObject = {};
						try {
							toolParameters = jsonParse<IDataObject>(query);
						} catch (error) {
							if (parameters.length === 1) {
								toolParameters = { [parameters[0].name]: query };
							}
						}

						const httpRequestOptions: IHttpRequestOptions = {
							method,
							url,
						};

						if (pathParameters.length) {
							for (const parameter of pathParameters) {
								const parameterName = parameter.name;
								const parameterValue = encodeURIComponent(toolParameters[parameterName] as string);
								path = path.replace(`{${parameterName}}`, parameterValue);
							}
						}

						if (queryParameters.length) {
							for (const parameter of queryParameters) {
								const parameterName = parameter.name;
								const parameterValue = toolParameters[parameterName];
								qs[parameterName] = parameterValue;
							}
						}

						if (bodyParameters.length) {
							for (const parameter of bodyParameters) {
								const parameterName = parameter.name;
								const parameterValue = toolParameters[parameterName];
								body[parameterName] = parameterValue;
							}
						}

						httpRequestOptions.url += path;

						if (Object.keys(headers).length) {
							httpRequestOptions.headers = headers;
						}

						if (Object.keys(qs).length) {
							httpRequestOptions.qs = qs;
						}

						if (Object.keys(body)) {
							httpRequestOptions.body = body;
						}

						const responseData = await httpRequestFunction(httpRequestOptions);

						if (responseData && typeof responseData === 'object') {
							response = JSON.stringify(responseData, null, 2);
						} else if (typeof response === 'number') {
							response = String(responseData);
						} else {
							response = responseData as string;
						}
					} catch (error) {
						executionError = error;
						response = `There was an error: "${error.message}"`;
					}

					if (typeof response !== 'string') {
						executionError = new NodeOperationError(this.getNode(), 'Wrong output type returned', {
							description: `The response property should be a string, but it is an ${typeof response}`,
						});
						response = `There was an error: "${executionError.message}"`;
					}

					if (executionError) {
						void this.addOutputData(
							NodeConnectionType.AiTool,
							index,
							executionError as ExecutionError,
						);
					} else {
						void this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: { response } }]]);
					}
					return response;
				},
			}),
		};
	}
}
