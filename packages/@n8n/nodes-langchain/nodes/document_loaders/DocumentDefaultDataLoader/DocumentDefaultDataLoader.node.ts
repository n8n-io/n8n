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
import { metadataFilterField } from '../../../utils/sharedFields';

// Dependencies needed underneath the hood for the loaders. We add them
// here only to track where what dependency is sued
// import 'd3-dsv'; // for csv
import 'mammoth'; // for docx
import 'epub2'; // for epub
import 'pdf-parse'; // for pdf
import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';

export class DocumentDefaultDataLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Default Data Loader',
		name: 'documentDefaultDataLoader',
		icon: 'file:binary.svg',
		group: ['transform'],
		version: 1,
		description: 'Load data from previous step in the workflow',
		defaults: {
			name: 'Default Data Loader',
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
			{
				displayName:
					'This will load data from a previous step in the workflow. <a href="/templates/1962" target="_blank">Example</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Type of Data',
				name: 'dataType',
				type: 'options',
				default: 'json',
				required: true,
				noDataExpression: true,
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Process JSON data from previous step in the workflow',
					},
					{
						name: 'Binary',
						value: 'binary',
						description: 'Process binary data from previous step in the workflow',
					},
				],
			},
			{
				displayName: 'Mode',
				name: 'jsonMode',
				type: 'options',
				default: 'allInputData',
				required: true,
				displayOptions: {
					show: {
						dataType: ['json'],
					},
				},
				options: [
					{
						name: 'Load All Input Data',
						value: 'allInputData',
						description: 'Use all JSON data that flows into the parent agent or chain',
					},
					{
						name: 'Load Specific Data',
						value: 'expressionData',
						description:
							'Load a subset of data, and/or data from any previous step in the workflow',
					},
				],
			},
			{
				displayName: 'Mode',
				name: 'binaryMode',
				type: 'options',
				default: 'allInputData',
				required: true,
				displayOptions: {
					show: {
						dataType: ['binary'],
					},
				},
				options: [
					{
						name: 'Load All Input Data',
						value: 'allInputData',
						description: 'Use all Binary data that flows into the parent agent or chain',
					},
					{
						name: 'Load Specific Data',
						value: 'specificField',
						description: 'Load data from a specific field in the parent agent or chain',
					},
				],
			},
			{
				displayName: 'Data Format',
				name: 'loader',
				type: 'options',
				default: 'auto',
				required: true,
				displayOptions: {
					show: {
						dataType: ['binary'],
					},
				},
				options: [
					{
						name: 'Automatically Detect by Mime Type',
						value: 'auto',
						description: 'Uses the mime type to detect the format',
					},
					{
						name: 'CSV',
						value: 'csvLoader',
						description: 'Load CSV files',
					},
					{
						name: 'Docx',
						value: 'docxLoader',
						description: 'Load Docx documents',
					},
					{
						name: 'EPub',
						value: 'epubLoader',
						description: 'Load EPub files',
					},
					{
						name: 'JSON',
						value: 'jsonLoader',
						description: 'Load JSON files',
					},
					{
						name: 'PDF',
						value: 'pdfLoader',
						description: 'Load PDF documents',
					},
					{
						name: 'Text',
						value: 'textLoader',
						description: 'Load plain text files',
					},
				],
			},
			{
				displayName: 'Data',
				name: 'jsonData',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				required: true,
				description: 'Drag and drop fields from the input pane, or use an expression',
				displayOptions: {
					show: {
						dataType: ['json'],
						jsonMode: ['expressionData'],
					},
				},
			},
			{
				displayName: 'Input Data Field Name',
				name: 'binaryDataKey',
				type: 'string',
				default: 'data',
				required: true,
				description:
					'The name of the field in the agent or chain’s input that contains the binary file to be processed',
				displayOptions: {
					show: {
						dataType: ['binary'],
					},
					hide: {
						binaryMode: ['allInputData'],
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
						displayName: 'JSON Pointers',
						name: 'pointers',
						type: 'string',
						default: '',
						description: 'Pointers to extract from JSON, e.g. "/text" or "/text, /meta/title"',
						displayOptions: {
							show: {
								'/loader': ['jsonLoader', 'auto'],
							},
						},
					},
					{
						displayName: 'CSV Separator',
						name: 'separator',
						type: 'string',
						description: 'Separator to use for CSV',
						default: ',',
						displayOptions: {
							show: {
								'/loader': ['csvLoader', 'auto'],
							},
						},
					},
					{
						displayName: 'CSV Column',
						name: 'column',
						type: 'string',
						default: '',
						description: 'Column to extract from CSV',
						displayOptions: {
							show: {
								'/loader': ['csvLoader', 'auto'],
							},
						},
					},
					{
						displayName: 'Split Pages in PDF',
						description: 'Whether to split PDF pages into separate documents',
						name: 'splitPages',
						type: 'boolean',
						default: true,
						displayOptions: {
							show: {
								'/loader': ['pdfLoader', 'auto'],
							},
						},
					},
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

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const dataType = this.getNodeParameter('dataType', itemIndex, 'json') as 'json' | 'binary';
		const textSplitter = (await this.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as TextSplitter | undefined;
		const binaryDataKey = this.getNodeParameter('binaryDataKey', itemIndex, '') as string;

		const processor =
			dataType === 'binary'
				? new N8nBinaryLoader(this, 'options.', binaryDataKey, textSplitter)
				: new N8nJsonLoader(this, 'options.', textSplitter);

		return {
			response: logWrapper(processor, this),
		};
	}
}
