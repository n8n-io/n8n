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
	extractPlaceholders,
} from './utils';

import {
	authenticationProperties,
	jsonInput,
	optimizeResponseProperties,
	parametersCollection,
	specifyBySelector,
} from './descriptions';

import {
	BODY_PARAMETERS_PLACEHOLDER,
	HEADERS_PARAMETERS_PLACEHOLDER,
	QUERY_PARAMETERS_PLACEHOLDER,
} from './interfaces';
import type { ParameterInputType, ParametersValues, ToolParameter } from './interfaces';

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

			...optimizeResponseProperties,
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const name = this.getNodeParameter('name', itemIndex) as string;
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const method = this.getNodeParameter('method', itemIndex, 'GET') as IHttpRequestMethods;
		const url = this.getNodeParameter('url', itemIndex) as string;

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

		const placeholders: ToolParameter[] = [];

		let qsPlaceholder: string = '';
		let headersPlaceholder: string = '';
		let bodyPlaceholder: string = '';

		const urlPlaceholders = extractPlaceholders(url);

		if (urlPlaceholders.length > 0) {
			for (const placeholder of urlPlaceholders) {
				placeholders.push({
					name: placeholder,
					type: 'string',
					required: true,
				});
			}
		}

		const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;
		if (sendQuery) {
			const specifyQuery = this.getNodeParameter('specifyQuery', itemIndex) as ParameterInputType;

			if (specifyQuery === 'model') {
				placeholders.push({
					name: QUERY_PARAMETERS_PLACEHOLDER,
					description:
						'Specify query parameters for request, if needed, here, must be a valid JSON object or null',
					type: 'json',
					required: false,
				});

				qsPlaceholder = `qs: {${QUERY_PARAMETERS_PLACEHOLDER}}`;
			}

			if (specifyQuery === 'keypair') {
				const queryParameters = [];
				const parametersQueryValues = this.getNodeParameter(
					'parametersQuery.values',
					itemIndex,
					[],
				) as ParametersValues;

				for (const entry of parametersQueryValues) {
					if (entry.valueProvider.includes('model')) {
						queryParameters.push(`"${entry.name}":{${entry.name}}`);
						placeholders.push({
							name: entry.name,
							required: entry.valueProvider === 'modelRequired',
						});
					} else {
						qs[entry.name] = entry.value;
					}
				}

				qsPlaceholder = `qs: {${queryParameters.join(',')}}`;
			}

			if (specifyQuery === 'json') {
				const jsonQuery = this.getNodeParameter('jsonQuery', itemIndex, '') as string;

				const matches = extractPlaceholders(jsonQuery);

				for (const match of matches) {
					placeholders.push({
						name: match,
						required: true,
					});
				}

				qsPlaceholder = `qs: ${jsonQuery}`;
			}
		}

		const sendHeaders = this.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
		if (sendHeaders) {
			const specifyHeaders = this.getNodeParameter(
				'specifyHeaders',
				itemIndex,
			) as ParameterInputType;

			if (specifyHeaders === 'model') {
				placeholders.push({
					name: HEADERS_PARAMETERS_PLACEHOLDER,
					description:
						'Specify headers for request, if needed, here, must be a valid JSON object or null',
					type: 'json',
					required: false,
				});

				headersPlaceholder = `headers: {${HEADERS_PARAMETERS_PLACEHOLDER}}`;
			}

			if (specifyHeaders === 'keypair') {
				const headersParameters = [];
				const parametersHeadersValues = this.getNodeParameter(
					'parametersHeaders.values',
					itemIndex,
					[],
				) as ParametersValues;

				for (const entry of parametersHeadersValues) {
					if (entry.valueProvider.includes('model')) {
						headersParameters.push(`"${entry.name}":{${entry.name}}`);
						placeholders.push({
							name: entry.name,
							required: entry.valueProvider === 'modelRequired',
						});
					} else {
						headers[entry.name] = entry.value;
					}
				}

				headersPlaceholder = `headers: {${headersParameters.join(',')}}`;
			}

			if (specifyHeaders === 'json') {
				const jsonHeaders = this.getNodeParameter('jsonHeaders', itemIndex, '') as string;

				const matches = extractPlaceholders(jsonHeaders);

				for (const match of matches) {
					placeholders.push({
						name: match,
						required: true,
					});
				}

				headersPlaceholder = `headers: ${jsonHeaders}`;
			}
		}

		const sendBody = this.getNodeParameter('sendBody', itemIndex, false) as boolean;
		if (sendBody) {
			const specifyBody = this.getNodeParameter('specifyBody', itemIndex) as ParameterInputType;

			if (specifyBody === 'model') {
				placeholders.push({
					name: BODY_PARAMETERS_PLACEHOLDER,
					description:
						'Specify body for request, if needed, here, must be a valid JSON object or null',
					type: 'json',
					required: false,
				});

				bodyPlaceholder = `body: {${BODY_PARAMETERS_PLACEHOLDER}}`;
			}

			if (specifyBody === 'keypair') {
				const bodyParameters = [];
				const parametersBodyValues = this.getNodeParameter(
					'parametersBody.values',
					itemIndex,
					[],
				) as ParametersValues;

				for (const entry of parametersBodyValues) {
					if (entry.valueProvider.includes('model')) {
						bodyParameters.push(`"${entry.name}":{${entry.name}}`);
						placeholders.push({
							name: entry.name,
							required: entry.valueProvider === 'modelRequired',
						});
					} else {
						body[entry.name] = entry.value;
					}
				}

				bodyPlaceholder = `body: {${bodyParameters.join(',')}}`;
			}

			if (specifyBody === 'json') {
				const jsonBody = this.getNodeParameter('jsonBody', itemIndex, '') as string;

				const matches = extractPlaceholders(jsonBody);

				for (const match of matches) {
					placeholders.push({
						name: match,
						required: true,
					});
				}

				bodyPlaceholder = `body: ${jsonBody}`;
			}
		}

		const optionsExpectedFromLLM = [
			'{',
			`"url": "${url}"`,
			`"method": "${method}"`,
			`${qsPlaceholder ? `qs: ${qsPlaceholder},` : ''}`,
			`${headersPlaceholder ? `headers: ${headersPlaceholder},` : ''}`,
			`${bodyPlaceholder ? `body: ${bodyPlaceholder},` : ''}`,
			'}',
		]
			.filter((e) => e)
			.join(',\n');

		let description = `
${toolDescription}

This is the expected tool input: a stringified JSON object that needs to be sent as a string.
It represents options for an HTTP request done with Axios. Replace all placeholders with actual values.
Placeholders satisfy this regex: /(\{[a-zA-Z0-9_]+\})/g.
You forbiden to change anything else except for the placeholders.

${optionsExpectedFromLLM}`;

		if (placeholders.length) {
			description += `
Below are the descriptions of the placeholders.
Required placeholders are marked accordingly.
Extract descriptions from the prompt if available.
If a placeholder lacks a description, infer its meaning based:
${placeholders.map((parameter) => `${parameter.name}(description: ${parameter.description || ''}, type: ${parameter.type || ''}, required: ${parameter.required})`).join(', ')}`;
		}

		return {
			response: new DynamicTool({
				name,
				description,
				func: async (stringifiedRequestOptions: string): Promise<string> => {
					const { index } = this.addInputData(NodeConnectionType.AiTool, [
						[{ json: { stringifiedRequestOptions } }],
					]);

					let response: string = '';
					let executionError: Error | undefined = undefined;

					let requestOptions: IHttpRequestOptions | null = null;

					// parse LLM's input
					try {
						requestOptions = jsonParse<IHttpRequestOptions>(stringifiedRequestOptions);
					} catch (error) {
						const errorMessage = `Input could not be parsed as JSON: ${stringifiedRequestOptions}`;
						executionError = new NodeOperationError(this.getNode(), errorMessage, {
							itemIndex,
						});

						response = errorMessage;
					}

					//add user provided request options
					if (requestOptions) {
						if (Object.keys(headers).length) {
							requestOptions.headers = requestOptions.headers
								? { ...requestOptions.headers, ...headers }
								: headers;
						}

						if (Object.keys(qs).length) {
							requestOptions.qs = requestOptions.qs ? { ...requestOptions.qs, ...qs } : qs;
						}

						if (Object.keys(body)) {
							requestOptions.body = requestOptions.body
								? { ...(requestOptions.body as IDataObject), ...body }
								: body;
						}

						// send request and optimize response
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
