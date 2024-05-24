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

import {
	configureHttpRequestFunction,
	prettifyToolName,
	configureResponseOptimizer,
	prepareParameters,
	extractParametersFromText,
} from './utils';

import {
	authenticationProperties,
	jsonInput,
	optimizeResponseProperties,
	parametersCollection,
	placeholderDefinitionsCollection,
	specifyBySelector,
} from './descriptions';

import type {
	ParameterInputType,
	ParametersValues,
	PlaceholderDefinition,
	ToolParameter,
} from './interfaces';

import { DynamicTool } from '@langchain/core/tools';

import get from 'lodash/get';
import set from 'lodash/set';

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
				required: true,
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
				required: true,
				placeholder: 'e.g. http://www.example.com/{path}',
				validateType: 'url',
			},
			...authenticationProperties,
			//Query parameters
			{
				displayName: 'Send Query Parameters',
				name: 'sendQuery',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the request has query params or not',
			},
			{
				...specifyBySelector,
				displayName: 'Specify Query Parameters',
				name: 'specifyQuery',
				displayOptions: {
					show: {
						sendQuery: [true],
					},
				},
			},
			{
				...parametersCollection,
				displayName: 'Query Parameters',
				name: 'parametersQuery',
				displayOptions: {
					show: {
						sendQuery: [true],
						specifyQuery: ['keypair'],
					},
				},
			},
			{
				...jsonInput,
				name: 'jsonQuery',
				displayOptions: {
					show: {
						sendQuery: [true],
						specifyQuery: ['json'],
					},
				},
			},
			//Headers parameters
			{
				displayName: 'Send Headers',
				name: 'sendHeaders',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the request has headers or not',
			},
			{
				...specifyBySelector,
				displayName: 'Specify Headers',
				name: 'specifyHeaders',
				displayOptions: {
					show: {
						sendHeaders: [true],
					},
				},
			},
			{
				...parametersCollection,
				displayName: 'Header Parameters',
				name: 'parametersHeaders',
				displayOptions: {
					show: {
						sendHeaders: [true],
						specifyHeaders: ['keypair'],
					},
				},
			},
			{
				...jsonInput,
				name: 'jsonHeaders',
				displayOptions: {
					show: {
						sendHeaders: [true],
						specifyHeaders: ['json'],
					},
				},
			},
			//Body parameters
			{
				displayName: 'Send Body',
				name: 'sendBody',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the request has body or not',
			},
			{
				...specifyBySelector,
				displayName: 'Specify Body',
				name: 'specifyBody',
				displayOptions: {
					show: {
						sendBody: [true],
					},
				},
			},
			{
				...parametersCollection,
				displayName: 'Body Parameters',
				name: 'parametersBody',
				displayOptions: {
					show: {
						sendBody: [true],
						specifyBody: ['keypair'],
					},
				},
			},
			{
				...jsonInput,
				name: 'jsonBody',
				displayOptions: {
					show: {
						sendBody: [true],
						specifyBody: ['json'],
					},
				},
			},
			placeholderDefinitionsCollection,
			...optimizeResponseProperties,
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const name = this.getNodeParameter('name', itemIndex) as string;
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const method = this.getNodeParameter('method', itemIndex, 'GET') as IHttpRequestMethods;
		const url = this.getNodeParameter('url', itemIndex) as string;
		const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;
		const sendHeaders = this.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
		const sendBody = this.getNodeParameter('sendBody', itemIndex, false) as boolean;

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

		let qs: IDataObject = {};
		let headers: IDataObject = {};
		let body: IDataObject = {};

		const placeholders = this.getNodeParameter(
			'placeholderDefinitions.values',
			itemIndex,
			[],
		) as ToolParameter[];

		const toolParameters: ToolParameter[] = [];

		toolParameters.push(
			...extractParametersFromText(placeholders as PlaceholderDefinition[], url, 'path'),
		);

		if (sendQuery) {
			const queryInputParameters = prepareParameters(
				(this.getNodeParameter('parametersQuery.values', itemIndex, []) as ParametersValues) || [],
				placeholders as PlaceholderDefinition[],
				this.getNodeParameter('specifyQuery', itemIndex, 'keypair') as ParameterInputType,
				'qs',
				'Query parameters for request as key value pairs',
			);
			toolParameters.push(...queryInputParameters.parameters);
			qs = { ...qs, ...queryInputParameters.values };
		}

		if (sendHeaders) {
			const headersInputParameters = prepareParameters(
				(this.getNodeParameter('parametersHeaders.values', itemIndex, []) as ParametersValues) ||
					[],
				placeholders as PlaceholderDefinition[],
				this.getNodeParameter('specifyHeaders', itemIndex, 'keypair') as ParameterInputType,
				'headers',
				'Headers parameters for request as key value pairs',
			);
			toolParameters.push(...headersInputParameters.parameters);
			headers = { ...headers, ...headersInputParameters.values };
		}

		if (sendBody) {
			const bodyInputParameters = prepareParameters(
				(this.getNodeParameter('parametersBody.values', itemIndex, []) as ParametersValues) || [],
				placeholders as PlaceholderDefinition[],
				this.getNodeParameter('specifyBody', itemIndex, 'keypair') as ParameterInputType,
				'body',
				'Body parameters for request as key value pairs',
			);
			toolParameters.push(...bodyInputParameters.parameters);
			body = { ...body, ...bodyInputParameters.values };
		}

		let description = `${toolDescription}`;

		if (toolParameters.length) {
			description += `
		Tool expects valid stringified JSON object with ${toolParameters.length} properties.
		Property names with description, type and required status:

		${toolParameters
			.filter((p) => p.name)
			.map(
				(p) =>
					`${p.name}: (description: ${p.description || ''}, type: ${p.type || 'string'}, required: ${!!p.required})`,
			)
			.join(',\n ')}

			ALL parameters marked as required must be provided`;
		}

		const func = async (query: string): Promise<string> => {
			const { index } = this.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);

			let response: string = '';
			let executionError: Error | undefined = undefined;
			let requestOptions: IHttpRequestOptions | null = null;

			try {
				if (query && toolParameters.length) {
					let queryParset;

					try {
						queryParset = jsonParse<IDataObject>(query);
					} catch (error) {
						if (toolParameters.length === 1) {
							queryParset = { [toolParameters[0].name]: query };
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`Input is not a valid JSON: ${error.message}`,
								{ itemIndex },
							);
						}
					}

					requestOptions = {
						url,
						method,
						headers,
						qs,
						body,
					};

					for (const parameter of toolParameters) {
						let parameterValue = queryParset[parameter.name];

						if (parameterValue === undefined && parameter.required) {
							throw new NodeOperationError(
								this.getNode(),
								`Model did not provided required parameter: ${parameter.name}`,
								{
									itemIndex,
								},
							);
						}

						if (parameterValue && parameter.type === 'json' && typeof parameterValue !== 'object') {
							try {
								parameterValue = jsonParse(String(parameterValue));
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									`Parameter ${parameter.name} is not a valid JSON: ${error.message}`,
									{
										itemIndex,
									},
								);
							}
						}

						if (parameter.sendIn === 'path') {
							requestOptions.url = requestOptions.url.replace(
								`{${parameter.name}}`,
								encodeURIComponent(String(parameterValue)),
							);

							continue;
						}

						if (parameter.sendIn === parameter.name) {
							set(requestOptions, [parameter.sendIn], parameterValue);

							continue;
						}

						if (parameter.key) {
							let requestOptionsValue = get(requestOptions, [parameter.sendIn, parameter.key]);

							if (typeof requestOptionsValue === 'string') {
								requestOptionsValue = requestOptionsValue.replace(
									`{${parameter.name}}`,
									String(parameterValue),
								);
							}

							set(requestOptions, [parameter.sendIn, parameter.key], requestOptionsValue);

							continue;
						}

						set(requestOptions, [parameter.sendIn, parameter.name], parameterValue);
					}

					if (!Object.keys(requestOptions.headers as IDataObject).length) {
						delete requestOptions.headers;
					}

					if (!Object.keys(requestOptions.qs as IDataObject).length) {
						delete requestOptions.qs;
					}

					if (!Object.keys(requestOptions.body as IDataObject).length) {
						delete requestOptions.body;
					}
				} else {
					requestOptions = { url, method };
				}
			} catch (error) {
				const errorMessage = 'Input provided by model is not valid';

				if (error instanceof NodeOperationError) {
					executionError = error;
				} else {
					executionError = new NodeOperationError(this.getNode(), errorMessage, {
						itemIndex,
					});
				}

				response = errorMessage;
			}

			if (requestOptions) {
				try {
					response = optimizeResponse(await httpRequest(requestOptions));
				} catch (error) {
					response = `There was an error: "${error.message}"`;
				}
			}

			if (typeof response !== 'string') {
				executionError = new NodeOperationError(this.getNode(), 'Wrong output type returned', {
					description: `The response property should be a string, but it is an ${typeof response}`,
				});
				response = `There was an error: "${executionError.message}"`;
			}

			if (executionError) {
				void this.addOutputData(NodeConnectionType.AiTool, index, executionError as ExecutionError);
			} else {
				void this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: { response } }]]);
			}

			return response;
		};

		let tool: DynamicTool | undefined = undefined;

		tool = new DynamicTool({
			name,
			description,
			func,
		});

		return {
			response: tool,
		};
	}
}
