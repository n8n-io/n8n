import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC,
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the assistant. The maximum length is 256 characters.',
		placeholder: 'e.g. My Assistant',
		required: true,
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'The description of the assistant. The maximum length is 512 characters.',
		placeholder: 'e.g. My personal assistant',
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		description:
			'The system instructions that the assistant uses. The maximum length is 32768 characters.',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Enable Code Interpreter',
		name: 'enableCodeInterpreter',
		type: 'boolean',
		default: false,
		description:
			'Whether to enable the code interpreter that allows the ssistants to write and run Python code in a sandboxed execution environment, find more <a href="https://platform.openai.com/docs/assistants/tools/code-interpreter" target="_blank">here</a>',
	},
	{
		displayName: 'Enable Knowledge Retrieval',
		name: 'enableKnowledgeRetrieval',
		type: 'boolean',
		default: false,
		description:
			'Whether to augments the assistant with knowledge from outside its model, such as proprietary product information or documents, find more <a href="https://platform.openai.com/docs/assistants/tools/knowledge-retrieval" target="_blank">here</a>',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Files',
		name: 'file_ids',
		type: 'multiOptions',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
		description:
			'The files to be used by the assistant, there can be a maximum of 20 files attached to the assistant',
		typeOptions: {
			loadOptionsMethod: 'getFiles',
		},
		default: [],
		hint: "Add more files by using the 'Upload a File' operation",
	},
];

const displayOptions = {
	show: {
		operation: ['createAssistant'],
		resource: ['assistant'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const name = this.getNodeParameter('name', i) as string;
	const assistantDescription = this.getNodeParameter('description', i) as string;
	const instructions = this.getNodeParameter('instructions', i) as string;
	const enableCodeInterpreter = this.getNodeParameter('enableCodeInterpreter', i) as boolean;
	const enableKnowledgeRetrieval = this.getNodeParameter('enableKnowledgeRetrieval', i) as boolean;
	const file_ids = this.getNodeParameter('file_ids', i, []) as string[];

	if (file_ids.length > 20) {
		throw new NodeOperationError(
			this.getNode(),
			'The maximum number of files that can be attached to the assistant is 20',
			{ itemIndex: i },
		);
	}

	const body: IDataObject = {
		model,
		name,
		description: assistantDescription,
		instructions,
		file_ids,
	};

	const tools = [];

	if (enableCodeInterpreter) {
		tools.push({
			type: 'code_interpreter',
		});
	}

	if (enableKnowledgeRetrieval) {
		tools.push({
			type: 'retrieval',
		});
	}

	if (tools.length) {
		body.tools = tools;
	}

	const response = await apiRequest.call(this, 'POST', '/assistants', {
		body,
		headers: {
			'OpenAI-Beta': 'assistants=v1',
		},
	});

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
