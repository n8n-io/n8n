import { RecursiveCharacterTextSplitter, type TextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type IDataObject,
	type INodeInputConfiguration,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { metadataFilterField } from '@utils/sharedFields';

// Dependencies needed underneath the hood for the loaders. We add them
// here only to track where what dependency is sued
// import 'd3-dsv'; // for csv
import 'mammoth'; // for docx
import 'epub2'; // for epub
import 'pdf-parse'; // for pdf

function getInputs(parameters: IDataObject) {
	const inputs: INodeInputConfiguration[] = [];

	const textSplittingMode = parameters?.textSplittingMode;
	// If text splitting mode is 'custom' or does not exist (v1), we need to add an input for the text splitter
	if (!textSplittingMode || textSplittingMode === 'custom') {
		inputs.push({
			displayName: 'Text Splitter',
			maxConnections: 1,
			type: 'ai_textSplitter',
			required: true,
		});
	}

	return inputs;
}

export class DocumentDefaultDataLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Default Data Loader',
		name: 'documentDefaultDataLoader',
		icon: 'file:binary.svg',
		group: ['transform'],
		version: [1, 1.1],
		defaultVersion: 1.1,
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

		inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,

		outputs: [NodeConnectionTypes.AiDocument],
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
				displayName: 'Text Splitting',
				name: 'textSplittingMode',
				type: 'options',
				default: 'simple',
				required: true,
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
				options: [
					{
						name: 'Simple',
						value: 'simple',
						description: 'Splits every 1000 characters with a 200 character overlap',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Connect a custom text-splitting sub-node',
					},
				],
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const dataType = this.getNodeParameter('dataType', itemIndex, 'json') as 'json' | 'binary';

		let textSplitter: TextSplitter | undefined;

		if (node.typeVersion === 1.1) {
			const textSplittingMode = this.getNodeParameter('textSplittingMode', itemIndex, 'simple') as
				| 'simple'
				| 'custom';

			if (textSplittingMode === 'simple') {
				textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
			} else if (textSplittingMode === 'custom') {
				textSplitter = (await this.getInputConnectionData(NodeConnectionTypes.AiTextSplitter, 0)) as
					| TextSplitter
					| undefined;
			}
		} else {
			textSplitter = (await this.getInputConnectionData(NodeConnectionTypes.AiTextSplitter, 0)) as
				| TextSplitter
				| undefined;
		}

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
