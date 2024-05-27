/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

import {
	configureHttpRequestFunction,
	prettifyToolName,
	configureResponseOptimizer,
	prepareParameters,
	extractParametersFromText,
	prepareToolDescription,
	configureToolFunction,
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
		const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;
		const sendHeaders = this.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
		const sendBody = this.getNodeParameter('sendBody', itemIndex, false) as boolean;

		const requestOptions: IHttpRequestOptions = {
			method: this.getNodeParameter('method', itemIndex, 'GET') as IHttpRequestMethods,
			url: this.getNodeParameter('url', itemIndex) as string,
			qs: {},
			headers: {},
			body: {},
		};

		const authentication = this.getNodeParameter('authentication', itemIndex, 'none') as
			| 'predefinedCredentialType'
			| 'genericCredentialType'
			| 'none';

		if (authentication !== 'none') {
			const domain = new URL(requestOptions.url).hostname;
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

		const rawRequestOptions: { [key: string]: string } = {
			qs: '',
			headers: '',
			body: '',
		};

		const placeholdersDefinitions = this.getNodeParameter(
			'placeholderDefinitions.values',
			itemIndex,
			[],
		) as PlaceholderDefinition[];

		const toolParameters: ToolParameter[] = [];

		toolParameters.push(
			...extractParametersFromText(placeholdersDefinitions, requestOptions.url, 'path'),
		);

		if (sendQuery) {
			const queryInputType = this.getNodeParameter(
				'specifyQuery',
				itemIndex,
				'keypair',
			) as ParameterInputType;

			let queryParametersValues: ParametersValues = [];

			if (queryInputType === 'json') {
				rawRequestOptions.qs = this.getNodeParameter('jsonQuery', itemIndex, '') as string;
			} else {
				queryParametersValues = this.getNodeParameter(
					'parametersQuery.values',
					itemIndex,
					[],
				) as ParametersValues;
			}

			const queryInputParameters = prepareParameters(
				queryParametersValues,
				placeholdersDefinitions,
				queryInputType,
				'qs',
				'Query parameters for request as key value pairs',
				rawRequestOptions.qs,
			);

			toolParameters.push(...queryInputParameters.parameters);
			requestOptions.qs = { ...requestOptions.qs, ...queryInputParameters.values };
		}

		if (sendHeaders) {
			const headersInputType = this.getNodeParameter(
				'specifyHeaders',
				itemIndex,
				'keypair',
			) as ParameterInputType;

			let headersParametersValues: ParametersValues = [];

			if (headersInputType === 'json') {
				rawRequestOptions.headers = this.getNodeParameter('jsonHeaders', itemIndex, '') as string;
			} else {
				headersParametersValues = this.getNodeParameter(
					'parametersHeaders.values',
					itemIndex,
					[],
				) as ParametersValues;
			}

			const headersInputParameters = prepareParameters(
				headersParametersValues,
				placeholdersDefinitions,
				headersInputType,
				'headers',
				'Headers parameters for request as key value pairs',
				rawRequestOptions.headers,
			);

			toolParameters.push(...headersInputParameters.parameters);
			requestOptions.headers = { ...requestOptions.headers, ...headersInputParameters.values };
		}

		if (sendBody) {
			const bodyInputType = this.getNodeParameter(
				'specifyBody',
				itemIndex,
				'keypair',
			) as ParameterInputType;

			let bodyParametersValues: ParametersValues = [];

			if (bodyInputType === 'json') {
				rawRequestOptions.body = this.getNodeParameter('jsonBody', itemIndex, '') as string;
			} else {
				bodyParametersValues = this.getNodeParameter(
					'parametersBody.values',
					itemIndex,
					[],
				) as ParametersValues;
			}

			const bodyInputParameters = prepareParameters(
				bodyParametersValues,
				placeholdersDefinitions,
				bodyInputType,
				'body',
				'Body parameters for request as key value pairs',
				rawRequestOptions.body,
			);

			toolParameters.push(...bodyInputParameters.parameters);
			requestOptions.body = {
				...(requestOptions.body as IDataObject),
				...bodyInputParameters.values,
			};
		}

		const func = configureToolFunction(
			this,
			itemIndex,
			toolParameters,
			requestOptions,
			rawRequestOptions,
			httpRequest,
			optimizeResponse,
		);

		const description = prepareToolDescription(toolDescription, toolParameters);

		const tool = new DynamicTool({ name, description, func });

		return {
			response: tool,
		};
	}
}
