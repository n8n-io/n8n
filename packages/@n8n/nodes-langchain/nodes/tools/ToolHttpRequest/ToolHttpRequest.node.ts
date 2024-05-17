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

import {
	configureHttpRequestFunction,
	prettifyToolName,
	configureResponseOptimizer,
} from './utils';

import {
	authenticationProperties,
	optimizeResponseProperties,
	parametersCollection,
} from './descriptions';

import { QUERY_PARAMETERS_PLACEHOLDER } from './interfaces';
import type { ParameterInputType, ToolParameter } from './interfaces';

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
				description:
					'Explain to LLM what this tool does, better description would allow LLM to produce expected result',
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
						name: 'DELETE',
						value: 'DELETE',
					},
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'PATCH',
						value: 'PATCH',
					},
					{
						name: 'POST',
						value: 'POST',
					},
					{
						name: 'PUT',
						value: 'PUT',
					},
				],
				default: 'GET',
			},
			{
				displayName:
					'Tip: You can use a {placeholder} for any part of the request to be filled by the model. Provide more context about them in the placeholders section',
				name: 'placeholderNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. http://www.example.com/{path}',
				validateType: 'url',
			},
			...authenticationProperties,
			//---------------------
			{
				displayName: 'Send Query Parameters',
				name: 'sendQuery',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the request has query params or not',
			},
			{
				displayName: 'Specify Query Parameters',
				name: 'specifyQuery',
				type: 'options',
				displayOptions: {
					show: {
						sendQuery: [true],
					},
				},
				options: [
					{
						name: 'Using Fields Below',
						value: 'keypair',
					},
					{
						name: 'Using JSON Below',
						value: 'json',
					},
					{
						name: 'Let Model Specify All',
						value: 'model',
					},
				],
				default: 'keypair',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						sendQuery: [true],
						specifyQuery: ['keypair'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Parameter',
				default: {
					parameters: [
						{
							name: '',
							value: '',
						},
					],
				},
				options: [
					{
						name: 'parameters',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value Provided',
								name: 'valueProvider',
								type: 'options',
								options: [
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'By Model (and is required)',
										value: 'modelRequired',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'By Model (but is optional)',
										value: 'modelOptional',
									},
									{
										name: 'Using Field Below',
										value: 'fieldValue',
									},
								],
								default: 'modelRequired',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								hint: 'Use a {placeholder} for any data to be filled in by the model',
								displayOptions: {
									show: {
										valueProvider: ['fieldValue'],
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'JSON',
				name: 'jsonQuery',
				type: 'json',
				hint: 'Use a {placeholder} for any data to be filled in by the model',
				displayOptions: {
					show: {
						sendQuery: [true],
						specifyQuery: ['json'],
					},
				},
				default: '',
			},
			//---------------------
			{
				displayName: 'Define Path',
				name: 'sendInPath',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the LLM should provide path parameters',
			},
			{
				...parametersCollection,
				name: 'pathParameters',
				displayOptions: {
					show: {
						sendInPath: [true],
					},
				},
			},
			{
				displayName: 'Define Query',
				name: 'sendInQuery',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the LLM should provide query parameters',
			},
			{
				...parametersCollection,
				name: 'queryParameters',
				displayOptions: {
					show: {
						sendInQuery: [true],
					},
				},
			},
			{
				displayName: 'Define Body',
				name: 'sendInBody',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the LLM should provide body parameters',
			},
			{
				...parametersCollection,
				name: 'bodyParameters',
				displayOptions: {
					show: {
						sendInBody: [true],
					},
				},
			},
			...optimizeResponseProperties,
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const name = this.getNodeParameter('name', itemIndex) as string;
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const method = this.getNodeParameter('method', itemIndex, 'GET') as IHttpRequestMethods;
		let url = this.getNodeParameter('url', itemIndex) as string;
		const authentication = this.getNodeParameter('authentication', itemIndex, 'none') as
			| 'predefinedCredentialType'
			| 'genericCredentialType'
			| 'none';

		if (authentication !== 'none') {
			const domain = new URL(url).hostname;
			if (domain.includes('{') && domain.includes('}')) {
				throw new NodeOperationError(
					this.getNode(),
					"Can't use a placeholder for the domain when using authentication",
					{
						itemIndex,
						description:
							'This is for security reasons, to prevent the model accidentally sending your credentials to an unauthorized domain',
					},
				);
			}
		}

		const httpRequest = await configureHttpRequestFunction(this, authentication, itemIndex);
		const optimizeResponse = configureResponseOptimizer(this, itemIndex);

		const qs: IDataObject = {};
		const headers: IDataObject = {};
		const body: IDataObject = {};

		const parameters: ToolParameter[] = [];
		const sendInQuery: string[] = [];
		const sendInPath: string[] = [];
		const sendInBody: string[] = [];

		const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;

		if (sendQuery) {
			const specifyQuery = this.getNodeParameter('specifyQuery', itemIndex) as ParameterInputType;

			if (specifyQuery === 'model') {
				parameters.push({
					name: QUERY_PARAMETERS_PLACEHOLDER,
					description:
						'This has to be valid query parameters string in the form of keypair, e.g. ?key1=value1&key2=value2, must starts with ?, must be valid url encoded. You must decide what shoul be sent in this request as query parameters',
					type: 'string',
					required: true,
				});
			}

			if (specifyQuery === 'keypair') {
				const queryParametersValues = this.getNodeParameter(
					'queryParameters.values',
					itemIndex,
					[],
				) as Array<{
					name: string;
					valueProvider: 'modelRequired' | 'modelOptional' | 'fieldValue';
					value: string;
				}>;

				for (const entry of queryParametersValues) {
					if (entry.valueProvider.includes('model')) {
						sendInQuery.push(entry.name);
						parameters.push({
							name: entry.name,
							description: entry.value,
							type: 'string',
							required: entry.valueProvider === 'modelRequired',
						});
					} else {
						qs[entry.name] = entry.value;
					}
				}
			}

			if (specifyQuery === 'json') {
				//TODO: Add support for JSON with placeholders
			}
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

		parameters.push(...pathParameters, ...queryParameters, ...bodyParameters);

		let description = toolDescription;
		if (parameters.length) {
			description +=
				` expecting following parameters, required would be marked as such, extract from prompt, if possible, ${parameters.map((parameter) => `${parameter.name}(description: ${parameter.description}, type: ${parameter.type}, required: ${parameter.required})`).join(', ')}` +
				'send as JSON object';
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

						if (pathParameters.length) {
							for (const parameter of pathParameters) {
								const parameterName = parameter.name;
								const parameterValue = encodeURIComponent(String(toolParameters[parameterName]));
								url = url.replace(`{${parameterName}}`, parameterValue);
							}
						}

						// Add query parameters to url defined by LLM
						if (toolParameters[QUERY_PARAMETERS_PLACEHOLDER]) {
							let toolParametersString = String(toolParameters[QUERY_PARAMETERS_PLACEHOLDER]);
							if (!toolParametersString.startsWith('?')) {
								toolParametersString = `?${encodeURIComponent(toolParametersString)}`;
							}
							url = `${url}${toolParameters[QUERY_PARAMETERS_PLACEHOLDER]}`;
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

						const requestOptions: IHttpRequestOptions = {
							method,
							url,
						};

						if (Object.keys(headers).length) {
							requestOptions.headers = headers;
						}

						if (Object.keys(qs).length) {
							requestOptions.qs = qs;
						}

						if (Object.keys(body)) {
							requestOptions.body = body;
						}

						response = optimizeResponse(await httpRequest(requestOptions));
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
