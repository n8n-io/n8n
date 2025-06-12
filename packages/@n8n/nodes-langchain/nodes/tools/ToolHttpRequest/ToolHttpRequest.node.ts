/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { DynamicTool } from '@langchain/core/tools';
import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	NodeOperationError,
	tryToParseAlphanumericString,
} from 'n8n-workflow';

import { N8nTool } from '@utils/N8nTool';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	authenticationProperties,
	jsonInput,
	optimizeResponseProperties,
	parametersCollection,
	placeholderDefinitionsCollection,
	specifyBySelector,
} from './descriptions';
import type { PlaceholderDefinition, ToolParameter } from './interfaces';
import {
	configureHttpRequestFunction,
	configureResponseOptimizer,
	extractParametersFromText,
	prepareToolDescription,
	configureToolFunction,
	updateParametersAndOptions,
	makeToolInputSchema,
} from './utils';

export class ToolHttpRequest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTTP Request Tool',
		name: 'toolHttpRequest',
		icon: { light: 'file:httprequest.svg', dark: 'file:httprequest.dark.svg' },
		group: ['output'],
		version: [1, 1.1],
		description: 'Makes an HTTP request and returns the response data',
		subtitle: '={{ $parameter.toolDescription }}',
		defaults: {
			name: 'HTTP Request',
		},
		credentials: [],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolhttprequest/',
					},
				],
			},
		},
		// Replaced by a `usableAsTool` version of the standalone HttpRequest node
		hidden: true,
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
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
			},
			...authenticationProperties,
			//----------------------------------------------------------------
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
			//----------------------------------------------------------------
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
			//----------------------------------------------------------------
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
			//----------------------------------------------------------------
			placeholderDefinitionsCollection,
			...optimizeResponseProperties,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const name = this.getNode().name.replace(/ /g, '_');
		try {
			tryToParseAlphanumericString(name);
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				'The name of this tool is not a valid alphanumeric string',
				{
					itemIndex,
					description:
						"Only alphanumeric characters and underscores are allowed in the tool's name, and the name cannot start with a number",
				},
			);
		}

		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;
		const sendHeaders = this.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
		const sendBody = this.getNodeParameter('sendBody', itemIndex, false) as boolean;

		const requestOptions: IHttpRequestOptions = {
			method: this.getNodeParameter('method', itemIndex, 'GET') as IHttpRequestMethods,
			url: this.getNodeParameter('url', itemIndex) as string,
			qs: {},
			headers: {
				// FIXME: This is a workaround to prevent the node from sending a default User-Agent (`n8n`) when the header is not set.
				//  Needs to be replaced with a proper fix after NODE-1777 is resolved
				'User-Agent': undefined,
			},
			body: {},
			// We will need a full response object later to extract the headers and check the response's content type.
			returnFullResponse: true,
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

		const placeholdersDefinitions = (
			this.getNodeParameter(
				'placeholderDefinitions.values',
				itemIndex,
				[],
			) as PlaceholderDefinition[]
		).map((p) => {
			if (p.name.startsWith('{') && p.name.endsWith('}')) {
				p.name = p.name.slice(1, -1);
			}
			return p;
		});

		const toolParameters: ToolParameter[] = [];

		toolParameters.push(
			...extractParametersFromText(placeholdersDefinitions, requestOptions.url, 'path'),
		);

		if (sendQuery) {
			updateParametersAndOptions({
				ctx: this,
				itemIndex,
				toolParameters,
				placeholdersDefinitions,
				requestOptions,
				rawRequestOptions,
				requestOptionsProperty: 'qs',
				inputTypePropertyName: 'specifyQuery',
				jsonPropertyName: 'jsonQuery',
				parametersPropertyName: 'parametersQuery.values',
			});
		}

		if (sendHeaders) {
			updateParametersAndOptions({
				ctx: this,
				itemIndex,
				toolParameters,
				placeholdersDefinitions,
				requestOptions,
				rawRequestOptions,
				requestOptionsProperty: 'headers',
				inputTypePropertyName: 'specifyHeaders',
				jsonPropertyName: 'jsonHeaders',
				parametersPropertyName: 'parametersHeaders.values',
			});
		}

		if (sendBody) {
			updateParametersAndOptions({
				ctx: this,
				itemIndex,
				toolParameters,
				placeholdersDefinitions,
				requestOptions,
				rawRequestOptions,
				requestOptionsProperty: 'body',
				inputTypePropertyName: 'specifyBody',
				jsonPropertyName: 'jsonBody',
				parametersPropertyName: 'parametersBody.values',
			});
		}

		for (const placeholder of placeholdersDefinitions) {
			if (!toolParameters.find((parameter) => parameter.name === placeholder.name)) {
				throw new NodeOperationError(
					this.getNode(),
					`Misconfigured placeholder '${placeholder.name}'`,
					{
						itemIndex,
						description:
							"This placeholder is defined in the 'Placeholder Definitions' but isn't used anywhere. Either remove the definition, or add the placeholder to a part of the request.",
					},
				);
			}
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

		let tool: DynamicTool | N8nTool;

		// If the node version is 1.1 or higher, we use the N8nTool wrapper:
		// it allows to use tool as a DynamicStructuredTool and have a fallback to DynamicTool
		if (this.getNode().typeVersion >= 1.1) {
			const schema = makeToolInputSchema(toolParameters);

			tool = new N8nTool(this, {
				name,
				description: toolDescription,
				func,
				schema,
			});
		} else {
			// Keep the old behavior for nodes with version 1.0
			const description = prepareToolDescription(toolDescription, toolParameters);
			tool = new DynamicTool({ name, description, func });
		}

		return {
			response: tool,
		};
	}
}
