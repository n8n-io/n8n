import { type DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type {
	IExecuteFunctions,
	INodeExecutionData,
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
	nodeNameToToolName,
	tryToParseAlphanumericString,
} from 'n8n-workflow';

import { N8nTool } from '@utils/N8nTool';
import { getConnectionHintNoticeField } from '@n8n/ai-utilities';

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

async function getTool(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
	log = true,
): Promise<DynamicTool | DynamicStructuredTool> {
	const name = nodeNameToToolName(ctx.getNode());
	try {
		tryToParseAlphanumericString(name);
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			'The name of this tool is not a valid alphanumeric string',
			{
				itemIndex,
				description:
					"Only alphanumeric characters and underscores are allowed in the tool's name, and the name cannot start with a number",
			},
		);
	}

	const toolDescription = ctx.getNodeParameter('toolDescription', itemIndex) as string;
	const sendQuery = ctx.getNodeParameter('sendQuery', itemIndex, false) as boolean;
	const sendHeaders = ctx.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
	const sendBody = ctx.getNodeParameter('sendBody', itemIndex, false) as boolean;

	const requestOptions: IHttpRequestOptions = {
		method: ctx.getNodeParameter('method', itemIndex, 'GET') as IHttpRequestMethods,
		url: ctx.getNodeParameter('url', itemIndex) as string,
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

	const authentication = ctx.getNodeParameter('authentication', itemIndex, 'none') as
		| 'predefinedCredentialType'
		| 'genericCredentialType'
		| 'none';

	if (authentication !== 'none') {
		const domain = new URL(requestOptions.url).hostname;
		if (domain.includes('{') && domain.includes('}')) {
			throw new NodeOperationError(
				ctx.getNode(),
				"Can't use a placeholder for the domain when using authentication",
				{
					itemIndex,
					description:
						'This is for security reasons, to prevent the model accidentally sending your credentials to an unauthorized domain',
				},
			);
		}
	}

	const httpRequest = await configureHttpRequestFunction(ctx, authentication, itemIndex);
	const optimizeResponse = configureResponseOptimizer(ctx, itemIndex);

	const rawRequestOptions: { [key: string]: string } = {
		qs: '',
		headers: '',
		body: '',
	};

	const placeholdersDefinitions = (
		ctx.getNodeParameter('placeholderDefinitions.values', itemIndex, []) as PlaceholderDefinition[]
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
			ctx,
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
			ctx,
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
			ctx,
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
				ctx.getNode(),
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
		ctx,
		itemIndex,
		toolParameters,
		requestOptions,
		rawRequestOptions,
		httpRequest,
		optimizeResponse,
		log,
	);

	let tool: DynamicTool | N8nTool;

	// If the node version is 1.1 or higher, we use the N8nTool wrapper:
	// it allows to use tool as a DynamicStructuredTool and have a fallback to DynamicTool
	if (ctx.getNode().typeVersion >= 1.1) {
		const schema = makeToolInputSchema(toolParameters);

		tool = new N8nTool(ctx, {
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

	return tool;
}

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
		builderHint: {
			searchHint:
				'Do not use this node. Attach the HTTP Request node as a tool (`n8n-nodes-base.httpRequestTool`) instead. It gives an agent the same request builder with the full parameter set.',
		},

		inputs: [],

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
		return { response: await getTool(this, itemIndex) };
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const response: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const tool = await getTool(this, itemIndex, false);
			try {
				const result = (await tool.invoke(items[itemIndex].json)) as string;
				response.push({ json: { response: result }, pairedItem: { item: itemIndex } });
			} catch (error) {
				throw error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}
		return [response];
	}
}
