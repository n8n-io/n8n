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
	},
	{
		name: 'Insert Documents',
		value: 'insert',
		description: 'Insert documents into vector store',
		action: 'Add documents to vector store',
	},
	{
		name: 'Retrieve Documents (As Vector Store for Chain/Tool)',
		value: 'retrieve',
		description: 'Retrieve documents from vector store to be used as vector store with AI nodes',
		action: 'Retrieve documents for Chain/Tool as Vector Store',
		outputConnectionType: NodeConnectionTypes.AiVectorStore,
	},
	{
		name: 'Retrieve Documents (As Tool for AI Agent)',
		value: 'retrieve-as-tool',
		description: 'Retrieve documents from vector store to be used as tool with AI nodes',
		action: 'Retrieve documents for AI Agent as Tool',
		outputConnectionType: NodeConnectionTypes.AiTool,
	},
	{
		name: 'Update Documents',
		value: 'update',
		description: 'Update documents in vector store by ID',
		action: 'Update vector store documents',
	},
];
