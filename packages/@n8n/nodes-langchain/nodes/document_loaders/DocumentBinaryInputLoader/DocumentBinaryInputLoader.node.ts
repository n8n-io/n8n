/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import type { TextSplitter } from '@langchain/textsplitters';

import { logWrapper } from '../../../utils/logWrapper';
import { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';
import { getConnectionHintNoticeField, metadataFilterField } from '../../../utils/sharedFields';

// Dependencies needed underneath the hood for the loaders. We add them
// here only to track where what dependency is sued
// import 'd3-dsv'; // for csv
import 'mammoth'; // for docx
import 'epub2'; // for epub
import 'pdf-parse'; // for pdf

export class DocumentBinaryInputLoader implements INodeType {
	description: INodeTypeDescription = {
		// This node is deprecated and will be removed in the future.
		// The functionality was merged with the `DocumentJSONInputLoader` to `DocumentDefaultDataLoader`
		hidden: true,
		displayName: 'Binary Input Loader',
		name: 'documentBinaryInputLoader',
		icon: 'file:binary.svg',
		group: ['transform'],
		version: 1,
		description: 'Use binary data from a previous step in the workflow',
		defaults: {
			name: 'Binary Input Loader',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentdefaultdataloader/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Text Splitter',
				maxConnections: 1,
				type: NodeConnectionType.AiTextSplitter,
				required: true,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiDocument],
		outputNames: ['Document'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
			{
				displayName: 'Loader Type',
				name: 'loader',
				type: 'options',
				default: 'jsonLoader',
				required: true,
				options: [
					{
						name: 'CSV Loader',
						value: 'csvLoader',
						description: 'Load CSV files',
					},
					{
						name: 'Docx Loader',
						value: 'docxLoader',
						description: 'Load Docx documents',
					},
					{
						name: 'EPub Loader',
						value: 'epubLoader',
						description: 'Load EPub files',
					},
					{
						name: 'JSON Loader',
						value: 'jsonLoader',
						description: 'Load JSON files',
					},
					{
						name: 'PDF Loader',
						value: 'pdfLoader',
						description: 'Load PDF documents',
					},
					{
						name: 'Text Loader',
						value: 'textLoader',
						description: 'Load plain text files',
					},
				],
			},
			{
				displayName: 'Binary Data Key',
				name: 'binaryDataKey',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property from which to read the file buffer',
			},
			// PDF Only Fields
			{
				displayName: 'Split Pages',
				name: 'splitPages',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						loader: ['pdfLoader'],
					},
				},
			},
			// CSV Only Fields
			{
				displayName: 'Column',
				name: 'column',
				type: 'string',
				default: '',
				description: 'Column to extract from CSV',
				displayOptions: {
					show: {
						loader: ['csvLoader'],
					},
				},
			},
			{
				displayName: 'Separator',
				name: 'separator',
				type: 'string',
				description: 'Separator to use for CSV',
				default: ',',
				displayOptions: {
					show: {
						loader: ['csvLoader'],
					},
				},
			},
			// JSON Only Fields
			{
				displayName: 'Pointers',
				name: 'pointers',
				type: 'string',
				default: '',
				description: 'Pointers to extract from JSON, e.g. "/text" or "/text, /meta/title"',
				displayOptions: {
					show: {
						loader: ['jsonLoader'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						...metadataFilterField,
						displayName: 'Metadata',
						description:
							'Metadata to add to each document. Could be used for filtering during retrieval',
						placeholder: 'Add property',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supply Data for Binary Input Loader');
		const textSplitter = (await this.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as TextSplitter | undefined;

		const binaryDataKey = this.getNodeParameter('binaryDataKey', 0) as string;
		const processor = new N8nBinaryLoader(this, undefined, binaryDataKey, textSplitter);

		return {
			response: logWrapper(processor, this),
		};
	}
}
