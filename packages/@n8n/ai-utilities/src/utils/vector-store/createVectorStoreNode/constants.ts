import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodePropertyOptions } from 'n8n-workflow';

import type { NodeOperationMode } from './types';

export const DEFAULT_OPERATION_MODES: NodeOperationMode[] = [
	'load',
	'insert',
	'retrieve',
	'retrieve-as-tool',
];

export const OPERATION_MODE_DESCRIPTIONS: INodePropertyOptions[] = [
	{
		name: 'Get Many',
		value: 'load',
		description: 'Get many ranked documents from vector store for query',
		action: 'Get ranked documents from vector store',
		builderHint: {
			message:
				"Declare with the `vectorStore({...})` factory. Required subnodes: `{ embedding }`. Performs a one-shot similarity search on the main flow using the `prompt` parameter — use this when you need a lookup outside an agent's tool-calling loop.",
		},
	},
	{
		name: 'Insert Documents',
		value: 'insert',
		description: 'Insert documents into vector store',
		action: 'Add documents to vector store',
		builderHint: {
			message:
				'Declare with the `vectorStore({...})` factory. Required subnodes: `{ embedding, documentLoader }`. Sits on the main flow — pipe the documents you want to embed into this node.',
		},
	},
	{
		name: 'Retrieve Documents (As Vector Store for Chain/Tool)',
		value: 'retrieve',
		description: 'Retrieve documents from vector store to be used as vector store with AI nodes',
		action: 'Retrieve documents for Chain/Tool as Vector Store',
		outputConnectionType: NodeConnectionTypes.AiVectorStore,
		builderHint: {
			message:
				"Declare with the `vectorStore({...})` factory. Required subnodes: `{ embedding }`. Plug the resulting node into another node's `subnodes` (e.g. a `toolVectorStore` node's `subnodes: { vectorStore }`).",
		},
	},
	{
		name: 'Retrieve Documents (As Tool for AI Agent)',
		value: 'retrieve-as-tool',
		description: 'Retrieve documents from vector store to be used as tool with AI nodes',
		action: 'Retrieve documents for AI Agent as Tool',
		outputConnectionType: NodeConnectionTypes.AiTool,
		builderHint: {
			message:
				"Declare with the `tool({...})` factory (NOT `vectorStore`). Required subnodes: `{ embedding }`. Set `toolDescription` so the agent knows when to call it. Plug into an AI Agent's `subnodes.tools` array — this is the canonical RAG pattern.",
		},
	},
	{
		name: 'Update Documents',
		value: 'update',
		description: 'Update documents in vector store by ID',
		action: 'Update vector store documents',
		builderHint: {
			message:
				'Declare with the `vectorStore({...})` factory. Required subnodes: `{ embedding }`. Updates documents by ID — only available on stores whose `operationModes` explicitly enables it.',
		},
	},
];
